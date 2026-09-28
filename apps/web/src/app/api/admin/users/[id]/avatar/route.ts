import { AVATAR_DATA_URL, MAX_AVATAR_CHARS } from "@/lib/avatar";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isAdmin } from "@/lib/admin-session";

// Same rule as the user's own avatar: a data URL (256×256), stored in the database.

/** POST { avatar_url } replaces this account's avatar; { avatar_url: null } removes it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { avatar_url?: unknown };
  let avatar: string | null;
  if (body.avatar_url === null) avatar = null;
  else if (typeof body.avatar_url === "string" && body.avatar_url.length <= MAX_AVATAR_CHARS && AVATAR_DATA_URL.test(body.avatar_url)) avatar = body.avatar_url;
  else return NextResponse.json({ error: "Ảnh đại diện phải là ảnh đã nén (tối đa khoảng 90KB)" }, { status: 400 });
  const [row] = await db.update(users).set({ avatar_url: avatar }).where(eq(users.id, id)).returning({ id: users.id, avatar_url: users.avatar_url });
  return row ? NextResponse.json(row) : NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
}
