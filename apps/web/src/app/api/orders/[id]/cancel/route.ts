import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { syncGroupCount } from "@/lib/queries";

/** Cancel is only possible before the 18:00 cut-off (order still "placed" and not attached to a run). */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const [o] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.user_id, user.id)));
  if (!o) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
  if (o.status !== "placed" || o.run_id) return NextResponse.json({ error: "Đã chốt sổ, lệnh thu hoạch đã gửi về vườn nên không huỷ được nữa" }, { status: 400 });
  await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, id));
  if (o.group_order_id) await syncGroupCount(o.group_order_id);
  return NextResponse.json({ ok: true });
}
