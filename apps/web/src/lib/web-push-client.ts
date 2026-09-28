"use client";

/** Browser side of Web Push: service worker + PushManager subscription, registered with /api/push/register. */
export type WebPushState = "unsupported" | "unconfigured" | "denied" | "off" | "on";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function supported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const toBase64Url = (buf: ArrayBuffer | null) => (buf ? btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : "");

/** True when the subscription was made with the server's current VAPID key. */
const sameKey = (sub: PushSubscription) => toBase64Url(sub.options.applicationServerKey) === VAPID_PUBLIC_KEY.replace(/=+$/, "");

async function save(sub: PushSubscription) {
  const res = await fetch("/api/push/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: "web", subscription: sub.toJSON() }) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Lỗi ${res.status}`);
}

export async function webPushState(): Promise<WebPushState> {
  if (!supported()) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return "off";
  // A subscription made with an old key can never be delivered to: drop it so the user can turn it on again.
  if (!sameKey(sub)) {
    await sub.unsubscribe().catch(() => {});
    return "off";
  }
  // The server may have lost this browser (database rebuilt): register it again quietly.
  save(sub).catch(() => {});
  return "on";
}

/** The push service refused this browser; explain what the person can actually do about it. */
function explain(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/push service error|push service not available|AbortError/i.test(msg)) {
    // Brave ships with Google's push service switched off; the person has to turn it on themselves.
    if ("brave" in navigator)
      return new Error("Brave đang tắt dịch vụ đẩy. Mở brave://settings/privacy, bật \"Use Google services for push messaging\", khởi động lại Brave rồi bấm lại nút này. Trong lúc đó thông báo vẫn hiện khi bạn đang mở trang.");
    return new Error("Trình duyệt này không kết nối được dịch vụ đẩy (Brave, trình duyệt trong app, hoặc mạng chặn Google). Thông báo vẫn hiện khi bạn đang mở trang; muốn nhận cả khi đóng trang, hãy dùng Chrome, Edge hoặc Firefox.");
  }
  return new Error(msg || "Không bật được thông báo");
}

/** Asks for permission (must run from a click), subscribes this browser and saves it on the server. */
export async function enableWebPush(): Promise<WebPushState> {
  if (!supported()) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "unconfigured";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const options = { userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) };
  let reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub)) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe(options);
    } catch {
      // A stale registration is the usual cause: start from a clean service worker and try once more.
      try {
        await (await reg.pushManager.getSubscription())?.unsubscribe();
        await reg.unregister();
        reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        sub = await reg.pushManager.subscribe(options);
      } catch (e) {
        throw explain(e);
      }
    }
  }
  await save(sub);
  return "on";
}

export async function disableWebPush(): Promise<WebPushState> {
  if (!supported()) return "unsupported";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/register", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe();
  }
  return "off";
}
