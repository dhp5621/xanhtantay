import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { group_orders, orders } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { syncGroupCount } from "@/lib/queries";
import { isPastCutoff } from "@/lib/commerce";

/** Leave a group before the cut-off: your box in that group is cancelled. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const [group] = await db.select().from(group_orders).where(eq(group_orders.id, id));
  if (!group) return NextResponse.json({ error: "Không tìm thấy nhóm" }, { status: 404 });
  if (group.status !== "open" || isPastCutoff(group.delivery_date)) return NextResponse.json({ error: "Nhóm đã chốt sổ, không rời được nữa" }, { status: 400 });
  const rows = await db.update(orders).set({ status: "cancelled" }).where(and(eq(orders.group_order_id, id), eq(orders.user_id, user.id), eq(orders.status, "placed"))).returning({ id: orders.id });
  if (!rows.length) return NextResponse.json({ error: "Bạn không ở trong nhóm này" }, { status: 409 });
  await syncGroupCount(id);
  return NextResponse.json({ ok: true });
}
