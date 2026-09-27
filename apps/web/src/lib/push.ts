import webpush from "web-push";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { push_devices } from "@/db/schema";

export type PushTarget = "mobile" | "web" | "all";
export interface PushMessage { title: string; body: string; url?: string }
export interface PushResult { mobile: { sent: number; failed: number }; web: { sent: number; failed: number }; removed: number; webConfigured: boolean }

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export const vapidPublicKey = () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function webPushReady() {
  const pub = vapidPublicKey(), priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://xanhtantay.vercel.app", pub, priv);
  return true;
}

/** Expo push API: up to 100 messages per request. Returns ids of devices whose token is dead. */
async function sendExpo(devices: { id: string; token: string }[], msg: PushMessage, out: PushResult["mobile"]) {
  const dead: string[] = [];
  for (let i = 0; i < devices.length; i += 100) {
    const batch = devices.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
        body: JSON.stringify(batch.map((d) => ({ to: d.token, title: msg.title, body: msg.body, sound: "default", data: msg.url ? { url: msg.url } : {} }))),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: { status: string; details?: { error?: string } }[] };
      batch.forEach((d, j) => {
        const t = json.data?.[j];
        if (t?.status === "ok") out.sent++;
        else {
          out.failed++;
          if (t?.details?.error === "DeviceNotRegistered") dead.push(d.id);
        }
      });
    } catch {
      out.failed += batch.length;
    }
  }
  return dead;
}

async function sendWeb(devices: { id: string; subscription: unknown }[], msg: PushMessage, out: PushResult["web"]) {
  const dead: string[] = [];
  const payload = JSON.stringify(msg);
  await Promise.all(
    devices.map(async (d) => {
      try {
        await webpush.sendNotification(d.subscription as webpush.PushSubscription, payload, { TTL: 60 * 60 * 24 });
        out.sent++;
      } catch (e) {
        out.failed++;
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(d.id);
      }
    })
  );
  return dead;
}

/** Broadcast one message to every registered phone and/or browser; prunes subscriptions that are gone. */
export async function broadcastPush(target: PushTarget, msg: PushMessage): Promise<PushResult> {
  const result: PushResult = { mobile: { sent: 0, failed: 0 }, web: { sent: 0, failed: 0 }, removed: 0, webConfigured: webPushReady() };
  const devices = await db.select().from(push_devices);
  const dead: string[] = [];
  if (target !== "web") dead.push(...(await sendExpo(devices.filter((d) => d.platform !== "web"), msg, result.mobile)));
  if (target !== "mobile" && result.webConfigured) dead.push(...(await sendWeb(devices.filter((d) => d.platform === "web" && d.subscription), msg, result.web)));
  if (dead.length) {
    await db.delete(push_devices).where(inArray(push_devices.id, dead));
    result.removed = dead.length;
  }
  return result;
}
