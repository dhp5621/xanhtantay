import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clusters, users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

// Avatars are stored inline as a tiny data URL (96×96 WebP ≈ 3–5 KB), never in Blob storage.
const MAX_AVATAR_CHARS = 24 * 1024;
const DATA_URL = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;
const FIELDS = { id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, avatar_url: users.avatar_url, cluster_id: users.cluster_id, address: users.address };

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const [row] = await db.select({ ...FIELDS, cluster: clusters }).from(users).leftJoin(clusters, eq(users.cluster_id, clusters.id)).where(eq(users.id, user.id));
  return NextResponse.json(row ?? null);
}

/** PATCH { name?, phone?, avatar_url?, cluster_id?, address? } */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { avatar_url?: unknown; name?: unknown; phone?: unknown; cluster_id?: unknown; address?: unknown };
  const updates: Partial<typeof users.$inferInsert> = {};

  if (body.avatar_url === null) updates.avatar_url = null;
  else if (typeof body.avatar_url === "string") {
    if (body.avatar_url.length > MAX_AVATAR_CHARS || !DATA_URL.test(body.avatar_url)) return NextResponse.json({ error: "Ảnh đại diện phải là ảnh đã nén (tối đa 24KB)" }, { status: 400 });
    updates.avatar_url = body.avatar_url;
  }
  if (typeof body.name === "string" && body.name.trim().length >= 2) updates.name = body.name.trim().slice(0, 60);
  if (typeof body.phone === "string") updates.phone = body.phone.replace(/[^\d+ ]/g, "").slice(0, 20) || null;
  if (typeof body.address === "string") updates.address = body.address.trim().slice(0, 120) || null;
  if (body.cluster_id === null) updates.cluster_id = null;
  else if (typeof body.cluster_id === "string") {
    const [c] = await db.select({ id: clusters.id }).from(clusters).where(eq(clusters.id, body.cluster_id));
    if (!c) return NextResponse.json({ error: "Chung cư không hợp lệ" }, { status: 400 });
    updates.cluster_id = c.id;
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 });
  const [row] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning(FIELDS);
  return NextResponse.json(row);
}
