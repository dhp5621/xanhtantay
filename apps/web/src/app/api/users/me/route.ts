import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

// Avatars are stored inline as a tiny data URL (96×96 WebP ≈ 3–5 KB), never in Blob storage.
const MAX_AVATAR_CHARS = 24 * 1024;
const DATA_URL = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const [row] = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, avatar_url: users.avatar_url }).from(users).where(eq(users.id, user.id));
  return NextResponse.json(row ?? null);
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { avatar_url, name, phone } = (body ?? {}) as { avatar_url?: unknown; name?: unknown; phone?: unknown };
  const updates: Partial<typeof users.$inferInsert> = {};

  if (avatar_url === null) updates.avatar_url = null;
  else if (typeof avatar_url === "string") {
    if (avatar_url.length > MAX_AVATAR_CHARS || !DATA_URL.test(avatar_url)) {
      return NextResponse.json({ error: "Ảnh đại diện phải là ảnh đã nén (tối đa 24KB)" }, { status: 400 });
    }
    updates.avatar_url = avatar_url;
  }
  if (typeof name === "string" && name.trim().length >= 2) updates.name = name.trim().slice(0, 60);
  if (typeof phone === "string") updates.phone = phone.replace(/[^\d+ ]/g, "").slice(0, 20) || null;
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 });

  const [row] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning({ id: users.id, name: users.name, avatar_url: users.avatar_url });
  return NextResponse.json(row);
}
