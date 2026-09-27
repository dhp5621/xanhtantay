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

export async function webPushState(): Promise<WebPushState> {
  if (!supported()) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

/** Asks for permission (must run from a click), subscribes this browser and saves it on the server. */
export async function enableWebPush(): Promise<WebPushState> {
  if (!supported()) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "unconfigured";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
  const res = await fetch("/api/push/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: "web", subscription: sub.toJSON() }) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Lỗi ${res.status}`);
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
