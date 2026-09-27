import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { push_devices, type WebPushSubscription } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

const PLATFORMS = new Set(["ios", "android", "web"]);

/**
 * Registers this phone (Expo push token) or browser (Web Push subscription) for broadcasts.
 * Signed-in callers are linked to their account; visitors are kept anonymously.
 * Body: { platform: "ios" | "android", token } or { platform: "web", subscription }.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { platform?: string; token?: string; subscription?: WebPushSubscription };
  const platform = String(body.platform ?? "");
  if (!PLATFORMS.has(platform)) return NextResponse.json({ error: "platform không hợp lệ" }, { status: 400 });

  let token: string;
  let subscription: WebPushSubscription | null = null;
  if (platform === "web") {
    const s = body.subscription;
    if (!s?.endpoint?.startsWith("https://") || !s.keys?.p256dh || !s.keys?.auth) return NextResponse.json({ error: "subscription không hợp lệ" }, { status: 400 });
    subscription = { endpoint: s.endpoint, expirationTime: s.expirationTime ?? null, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
    token = s.endpoint;
  } else {
    token = String(body.token ?? "");
    if (!/^Expo(nent)?PushToken\[.+\]$/.test(token)) return NextResponse.json({ error: "token không hợp lệ" }, { status: 400 });
  }

  const user = await getSessionUser();
  await db
    .insert(push_devices)
    .values({ platform, token, subscription, user_id: user?.id ?? null })
    .onConflictDoUpdate({ target: push_devices.token, set: { platform, subscription, user_id: user?.id ?? null, updated_at: sql`now()` } });
  return NextResponse.json({ ok: true });
}

/** Unregister: { token } (Expo token or Web Push endpoint). */
export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  if (!body.token) return NextResponse.json({ error: "Thiếu token" }, { status: 400 });
  await db.delete(push_devices).where(sql`${push_devices.token} = ${body.token}`);
  return NextResponse.json({ ok: true });
}
