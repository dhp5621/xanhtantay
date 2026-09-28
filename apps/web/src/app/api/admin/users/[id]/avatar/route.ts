import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isAdmin } from "@/lib/admin-session";

// Same rule as the user's own avatar: a tiny data URL (96×96), stored in the database.
const MAX_AVATAR_CHARS = 24 * 1024;
const DATA_URL = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;

/** POST { avatar_url } replaces this account's avatar; { avatar_url: null } removes it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { avatar_url?: unknown };
  let avatar: string | null;
  if (body.avatar_url === null) avatar = null;
  else if (typeof body.avatar_url === "string" && body.avatar_url.length <= MAX_AVATAR_CHARS && DATA_URL.test(body.avatar_url)) avatar = body.avatar_url;
  else return NextResponse.json({ error: "Ảnh đại diện phải là ảnh đã nén (tối đa 24KB)" }, { status: 400 });
  const [row] = await db.update(users).set({ avatar_url: avatar }).where(eq(users.id, id)).returning({ id: users.id, avatar_url: users.avatar_url });
  return row ? NextResponse.json(row) : NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
}
