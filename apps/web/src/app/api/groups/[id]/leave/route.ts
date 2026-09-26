import { NextResponse } from "next/server";
import { db } from "@/db";
import { group_orders, group_order_members } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

/** Leave a group you joined, as long as it is still open and not yet locked/delivered. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const [group] = await db.select().from(group_orders).where(eq(group_orders.id, id));
  if (!group) return NextResponse.json({ error: "Không tìm thấy nhóm" }, { status: 404 });
  if (group.status !== "open") return NextResponse.json({ error: "Nhóm đã chốt, không rời được nữa" }, { status: 400 });

  const [row] = await db.delete(group_order_members)
    .where(and(eq(group_order_members.group_order_id, id), eq(group_order_members.user_id, user.id)))
    .returning({ id: group_order_members.id });
  if (!row) return NextResponse.json({ error: "Bạn không ở trong nhóm này" }, { status: 409 });

  await db.update(group_orders).set({ current_members: sql`GREATEST(${group_orders.current_members} - 1, 0)` }).where(eq(group_orders.id, id));
  return NextResponse.json({ ok: true });
}
