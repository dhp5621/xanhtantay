import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router, usePathname } from "expo-router";
import { apiFetch } from "../constants/api";
import { guardAppLink, resolveAppLink } from "../constants/links";
import { categoriesReady, notificationData } from "../constants/push-actions";
import { useSession } from "./useSession";

// Show broadcasts as a banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const POLL_MS = 15_000;
const SEEN_KEY = "xtt-seen-notifications";

interface Item { id: string; title: string; body: string; url: string; category?: string; data?: Record<string, string> }

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
      // `url` is the specific screen the server named for this notification.
      content: { title: n.title, body: n.body, sound: "default", data: { ...n.data, url: n.url || n.data?.url || "/" }, ...(n.category ? { categoryIdentifier: n.category } : {}) },
      trigger: null,
    });
  }
}

// The launch check and the listener can both see one tap; it opens one screen.
const opened = new Set<string>();

/** The in-app route a tapped notification points at (`data.url`, e.g. "/don-hang/{id}" or "/farmer/vuon"). */
function tappedLink(response: Notifications.NotificationResponse | null): string | null {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  // Some system-shown pushes come without an identifier; the date tells them apart.
  const key = `${response.notification.request.identifier}:${response.notification.date}`;
  if (opened.has(key)) return null;
  opened.add(key);
  const url = notificationData(response.notification.request.content).url;
  return resolveAppLink(typeof url === "string" ? url : null);
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

  // A tapped notification waits here until there is a screen to leave from and the session is known.
  const pending = useRef<string | null>(null);
  const [queued, setQueued] = useState(0);
  const pathname = usePathname();

  // The Đồng ý / Không đồng ý buttons are answered in constants/push-actions; only taps on the
  // notification itself come here, including the one that started the app.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const take = (response: Notifications.NotificationResponse | null) => {
      const href = tappedLink(response);
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      try {
        Notifications.clearLastNotificationResponse();
      } catch {
        // not available in this runtime
      }
      if (!href) return;
      pending.current = href;
      setQueued((n) => n + 1);
    };
    let sub: { remove: () => void } | undefined;
    try {
      sub = Notifications.addNotificationResponseReceivedListener(take);
      take(Notifications.getLastNotificationResponse());
    } catch {
      // not available in this runtime (e.g. Expo Go on Android)
    }
    return () => sub?.remove();
  }, []);

  // "/" is only the redirect of a cold start: going anywhere before it settles would be undone.
  useEffect(() => {
    const href = pending.current;
    if (!href || loading || pathname === "/") return;
    pending.current = null;
    const target = guardAppLink(href, user);
    let tries = 0;
    const go = () => {
      try {
        router.push(target as never);
      } catch {
        // the navigator is not ready yet
        if (++tries < 20) setTimeout(go, 150);
      }
    };
    go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queued, loading, pathname]);
}
