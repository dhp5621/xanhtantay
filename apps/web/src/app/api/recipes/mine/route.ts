import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { user_recipes } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const rows = await db.select().from(user_recipes).where(eq(user_recipes.user_id, user.id)).orderBy(desc(user_recipes.created_at)).limit(50);
  return NextResponse.json(rows);
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const [row] = await db.delete(user_recipes).where(and(eq(user_recipes.id, id), eq(user_recipes.user_id, user.id))).returning({ id: user_recipes.id });
  if (!row) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
