import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { apiFetch, ApiError } from "./api";

/**
 * Answering a harvest command from the notification itself. Nothing here needs React or a screen:
 * this file is imported by the app entry (index.ts), so it also runs when Android starts the bundle
 * with no screen at all to deliver a button press to the background task.
 */

// The server names this category on every harvest command (docs/API.md).
export const COMMAND_CATEGORY = "harvest_command";
const BACKGROUND_TASK = "xtt-notification-response";

export type Answer = "confirm" | "decline";
export const isAnswer = (action: unknown): action is Answer => action === "confirm" || action === "decline";

/** What the task, the listener and the launch check all have in common. */
interface ResponseLike {
  actionIdentifier: string;
  notification: { request: { identifier: string; content: object } };
}

/** The two answers a farmer gives from the notification itself, without opening the app. */
async function registerCategories() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.setNotificationCategoryAsync(COMMAND_CATEGORY, [
      { identifier: "confirm", buttonTitle: "Đồng ý", options: { opensAppToForeground: false } },
      { identifier: "decline", buttonTitle: "Không đồng ý", options: { opensAppToForeground: false, isDestructive: true } },
    ]);
  } catch (e) {
    // not available in this runtime (e.g. Expo Go on Android)
    console.warn("[push] notification actions unavailable", e);
  }
}

// Registered as soon as the bundle loads, so the buttons exist before the first notification shows.
export const categoriesReady = registerCategories();

/**
 * The `data` of a notification. Listeners get it parsed; the background task gets the native
 * payload, where it is still the JSON string `dataString`.
 */
export function notificationData(content: object): Record<string, unknown> {
  const c = content as { data?: unknown; dataString?: unknown };
  if (c.data && typeof c.data === "object") return c.data as Record<string, unknown>;
  if (typeof c.dataString === "string") {
    try {
      const parsed = JSON.parse(c.dataString);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // not JSON: no data
    }
  }
  return {};
}

const HANDLED_KEY = "xtt-handled-responses";
const HANDLED_TTL_MS = 6 * 60 * 60 * 1000;
// One press can arrive through the task, the listener and the launch check.
const claimed = new Set<string>();

/** True for the first caller only, also across the screenless start and the app opened afterwards. */
async function claim(key: string): Promise<boolean> {
  if (claimed.has(key)) return false;
  claimed.add(key);
  try {
    const raw = await AsyncStorage.getItem(HANDLED_KEY);
    const now = Date.now();
    const recent = Object.entries((raw ? JSON.parse(raw) : {}) as Record<string, number>).filter(([, at]) => now - at < HANDLED_TTL_MS);
    if (recent.some(([k]) => k === key)) return false;
    await AsyncStorage.setItem(HANDLED_KEY, JSON.stringify(Object.fromEntries([...recent, [key, now]])));
  } catch {
    // storage unavailable: the in-memory set still guards this run
  }
  return true;
}

/** Sends the farmer's answer and shows, in the notification bar, what the server says about it. */
async function answerCommand(response: ResponseLike, choice: Answer) {
  const request = response.notification.request;
  if (!(await claim(`${request.identifier}:${choice}`))) return;
  const commandId = notificationData(request.content).commandId;
  let notice: { title?: unknown; body?: unknown } | null = null;
  try {
    if (typeof commandId !== "string" || !commandId) throw new Error("no command id");
    const result = await apiFetch(`/farmer/commands/${encodeURIComponent(commandId)}/${choice}`, { method: "POST" });
    notice = result?.notice ?? null;
  } catch (e) {
    notice = { title: "Chưa gửi được câu trả lời", body: e instanceof ApiError ? e.message : "Xin mở app để trả lời lại giúp ạ." };
  }
  try {
    await Notifications.dismissNotificationAsync(request.identifier);
  } catch {
    // already gone
  }
  // The wording is the server's; without it there is nothing to say.
  if (!notice || typeof notice.title !== "string" || !notice.title) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: notice.title, body: typeof notice.body === "string" ? notice.body : "", data: { url: "/farmer" } },
    trigger: null,
  });
}

/** Answers the command when the response is a press on Đồng ý / Không đồng ý. True when it was. */
export function handleAnswer(response: ResponseLike | null | undefined): boolean {
  if (!response || !isAnswer(response.actionIdentifier)) return false;
  answerCommand(response, response.actionIdentifier).catch(() => {});
  return true;
}

/**
 * Android, app in the background or closed: a button with `opensAppToForeground: false` is only
 * delivered to a task registered through expo-task-manager. iOS never runs the task for a button;
 * there the listener below gets it, so the task is not registered on iOS.
 */
function registerBackgroundTask() {
  if (Platform.OS !== "android") return;
  try {
    // Required here, not imported: a build made before expo-task-manager was added has no native
    // module, and the import alone would stop the app from starting.
    const TaskManager = require("expo-task-manager") as typeof import("expo-task-manager");
    TaskManager.defineTask<Notifications.NotificationTaskPayload>(BACKGROUND_TASK, async ({ data, error }) => {
      // An incoming push has no `actionIdentifier`; the system already shows it.
      if (error || !data || !("actionIdentifier" in data)) return;
      const choice = data.actionIdentifier;
      if (isAnswer(choice)) await answerCommand(data, choice);
    });
    Notifications.registerTaskAsync(BACKGROUND_TASK).catch((e) => console.warn("[push] background answers unavailable", e));
  } catch (e) {
    console.warn("[push] background answers unavailable", e);
  }
}

/** App open, or started by the system for the button (iOS): the press arrives as an event. */
function listenForAnswers() {
  if (Platform.OS === "web") return;
  const clear = () => {
    try {
      Notifications.clearLastNotificationResponse();
    } catch {
      // not available in this runtime
    }
  };
  try {
    Notifications.addNotificationResponseReceivedListener((r) => {
      if (handleAnswer(r)) clear();
    });
    // Pressed before this bundle was listening.
    if (handleAnswer(Notifications.getLastNotificationResponse())) clear();
  } catch {
    // not available in this runtime (e.g. Expo Go on Android)
  }
}

registerBackgroundTask();
listenForAnswers();
