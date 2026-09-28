import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { apiFetch, ApiError } from "../constants/api";
import { resolveAppLink } from "../constants/links";
import { useSession } from "./useSession";

// Show broadcasts as a banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const POLL_MS = 15_000;
const SEEN_KEY = "xtt-seen-notifications";

// The server names this category on every harvest command (docs/API.md).
const COMMAND_CATEGORY = "harvest_command";

interface Item { id: string; title: string; body: string; url: string; category?: string; data?: Record<string, string> }

/** The two answers a farmer gives from the notification itself, without opening the app. */
async function registerCategories() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.setNotificationCategoryAsync(COMMAND_CATEGORY, [
      { identifier: "confirm", buttonTitle: "Có, xác nhận", options: { opensAppToForeground: false } },
      { identifier: "decline", buttonTitle: "Không", options: { opensAppToForeground: false, isDestructive: true } },
    ]);
  } catch (e) {
    // not available in this runtime (e.g. Expo Go on Android)
    console.warn("[push] notification actions unavailable", e);
  }
}

// Registered as soon as the bundle loads, so the buttons exist before the first notification shows.
const categoriesReady = registerCategories();

/** Notification permission + Android channel. Local notifications need these too. */
async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Thông báo chung", importance: Notifications.AndroidImportance.HIGH });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  return status === "granted";
}

/** This device's Expo push token, or null when remote push isn't available in this build. */
async function getExpoPushToken(): Promise<string | null> {
  // Simulators can't receive pushes, and Expo Go (SDK 53+) no longer supports remote notifications on Android.
  if (!Device.isDevice) return null;
  if (Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/**
 * Delivery without FCM / APNs: asks the server what is new for this user and raises a local
 * notification for every id not seen before. Runs while the app is open.
 */
async function pollNotifications() {
  const { notifications } = (await apiFetch("/notifications?platform=mobile")) as { notifications: Item[] };
  const raw = await AsyncStorage.getItem(SEEN_KEY);
  const seen = raw ? new Set(JSON.parse(raw) as string[]) : null;
  // First run on this phone: remember what exists without announcing old news.
  const fresh = seen ? notifications.filter((n) => !seen.has(n.id)) : [];
  const next = seen ?? new Set<string>();
  notifications.forEach((n) => next.add(n.id));
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-100)));
  if (fresh.length) await categoriesReady;
  for (const n of fresh.reverse()) {
    await Notifications.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, sound: "default", data: { ...n.data, url: n.url }, ...(n.category ? { categoryIdentifier: n.category } : {}) },
      trigger: null,
    });
  }
}

/** Sends the farmer's Có / Không and tells them, in the notification bar, whether it arrived. */
async function answerCommand(response: Notifications.NotificationResponse, choice: "confirm" | "decline") {
  const commandId = response.notification.request.content.data?.commandId;
  let title: string;
  let body: string;
  try {
    if (typeof commandId !== "string" || !commandId) throw new Error("no command id");
    await apiFetch(`/farmer/commands/${encodeURIComponent(commandId)}/${choice}`, { method: "POST" });
    title = choice === "confirm" ? "Đã xác nhận" : "Đã báo không cắt được";
    body = choice === "confirm" ? "Hẹn bác 4h sáng. Xe tải lạnh qua lấy lúc 6h." : "Điều phối sẽ liên hệ lại với bác.";
  } catch (e) {
    title = "Chưa gửi được câu trả lời";
    body = e instanceof ApiError ? e.message : "Bác mở app để trả lời lại nhé.";
  }
  try {
    await Notifications.dismissNotificationAsync(response.notification.request.identifier);
  } catch {
    // already gone
  }
  await Notifications.scheduleNotificationAsync({ content: { title, body, data: { url: "/farmer" } }, trigger: null });
}

// The launch check and the listener can both see one response; each is handled once.
const handled = new Set<string>();

/** A button on the notification answers the command; a tap on the notification itself opens the app. */
function handleResponse(response: Notifications.NotificationResponse | null) {
  if (!response) return;
  const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
  if (handled.has(key)) return;
  handled.add(key);
  const action = response.actionIdentifier;
  if (action === "confirm" || action === "decline") {
    answerCommand(response, action).catch(() => {});
    return;
  }
  if (action === Notifications.DEFAULT_ACTION_IDENTIFIER) openNotification(response);
}

/** Opens the screen a tapped notification points at (`data.url`, e.g. "/don-hang" or "/farmer"). */
function openNotification(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  const href = resolveAppLink(typeof url === "string" ? url : null);
  if (href) router.push(href as never);
}

/**
 * Registers this phone for push. Runs on launch and again when the signed-in user changes, so the
 * server links the device to whoever is using it. Where remote push is unavailable, falls back to
 * polling and local notifications while the app is open.
 */
export function usePushNotifications() {
  const { user, loading } = useSession();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let appState: { remove: () => void } | undefined;
    (async () => {
      let allowed = false;
      let remote = false;
      try {
        allowed = await ensurePermission();
        const token = allowed ? await getExpoPushToken() : null;
        if (token && !cancelled) {
          await apiFetch("/push/register", { method: "POST", body: JSON.stringify({ platform: Platform.OS, token }) });
          remote = true;
        }
      } catch (e) {
        // No Firebase config (Android) or no push entitlement (iOS) in this build.
        console.warn("[push] remote push unavailable, polling instead", e);
      }
      // Remote push already delivers everything; polling would only duplicate it.
      if (cancelled || remote || !allowed) return;
      const tick = () => {
        if (AppState.currentState === "active") pollNotifications().catch(() => {});
      };
      tick();
      timer = setInterval(tick, POLL_MS);
      appState = AppState.addEventListener("change", (s) => {
        if (s === "active") tick();
      });
    })();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      appState?.remove();
    };
  }, [loading, userId]);

  // Tapping a notification deep-links into the app, its Có / Không buttons answer the command;
  // the launch notification is handled once the session is known.
  useEffect(() => {
    if (loading || Platform.OS === "web") return;
    try {
      const last = Notifications.getLastNotificationResponse();
      if (last) {
        Notifications.clearLastNotificationResponse();
        handleResponse(last);
      }
    } catch {
      // not available in this runtime (e.g. Expo Go on Android)
    }
    let sub: { remove: () => void } | undefined;
    try {
      sub = Notifications.addNotificationResponseReceivedListener((r) => {
        try {
          Notifications.clearLastNotificationResponse();
        } catch {
          // not available in this runtime
        }
        handleResponse(r);
      });
    } catch {
      // not available in this runtime (e.g. Expo Go on Android)
    }
    return () => sub?.remove();
  }, [loading]);
}
