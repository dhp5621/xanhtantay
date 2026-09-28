import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isAdmin } from "@/lib/admin-session";
import { hashPassword } from "@/lib/password";

/**
 * POST { password } sets this account's own password (8 to 72 characters).
 * POST { reset: true } removes it, so the account signs in with the shared demo password again.
 * The password is stored hashed and is never shown again.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  const { id } = await params;
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, id));
  if (!user) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { password?: unknown; reset?: unknown };
  if (body.reset === true) {
    await db.update(users).set({ password_hash: null }).where(eq(users.id, id));
    return NextResponse.json({ ok: true, own: false });
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8 || password.length > 72) return NextResponse.json({ error: "Mật khẩu cần từ 8 đến 72 ký tự" }, { status: 400 });
  await db.update(users).set({ password_hash: await hashPassword(password) }).where(eq(users.id, id));
  return NextResponse.json({ ok: true, own: true });
}
