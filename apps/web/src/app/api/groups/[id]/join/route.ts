import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { group_orders, group_order_members } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const [group] = await db.select().from(group_orders).where(eq(group_orders.id, id));
  if (!group) return NextResponse.json({ error: "Không tìm thấy nhóm" }, { status: 404 });
  if (group.status !== "open") {
    return NextResponse.json({ error: "Nhóm đã đóng" }, { status: 400 });
  }

  const body = await req.json();
  const { items = [] } = body;

  const [member] = await db.insert(group_order_members).values({
    group_order_id: id,
    user_id: userId,
    items,
  }).returning();

  await db
    .update(group_orders)
    .set({ current_members: sql`${group_orders.current_members} + 1` })
    .where(eq(group_orders.id, id));

  return NextResponse.json(member, { status: 201 });
}
