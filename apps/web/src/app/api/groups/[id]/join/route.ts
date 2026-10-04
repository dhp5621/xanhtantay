import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { boxes, group_orders, orders, users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { syncGroupCount } from "@/lib/queries";
import { careMessageOr, isPastCutoff, recipientFrom, shipFeeFor } from "@/lib/commerce";

/** POST { quantity?, address?, care_message?, recipient_name?, recipient_phone?, payment_method? } — joining places your box in the group's delivery. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role === "farmer") return NextResponse.json({ error: "Tài khoản nhà vườn không tham gia nhóm" }, { status: 403 });
  const [group] = await db.select().from(group_orders).where(eq(group_orders.id, id));
  if (!group) return NextResponse.json({ error: "Không tìm thấy nhóm" }, { status: 404 });
  if (group.status !== "open" || isPastCutoff(group.delivery_date)) return NextResponse.json({ error: "Nhóm đã chốt sổ" }, { status: 400 });
  const [existing] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.group_order_id, id), eq(orders.user_id, user.id), ne(orders.status, "cancelled")));
  if (existing) return NextResponse.json({ error: "Bạn đã ở trong nhóm này rồi" }, { status: 409 });

  const body = (await req.json().catch(() => ({}))) as { quantity?: number; address?: string; care_message?: string; recipient_name?: string; recipient_phone?: string; payment_method?: string };
  const qty = Math.min(20, Math.max(1, Math.round(Number(body.quantity ?? 1))));
  const [[box], [me]] = await Promise.all([db.select().from(boxes).where(eq(boxes.id, group.box_id)), db.select().from(users).where(eq(users.id, user.id))]);
  if (!box) return NextResponse.json({ error: "Hộp rau không còn bán" }, { status: 400 });
  const address = (body.address ?? me?.address ?? "").toString().trim().slice(0, 120) || null;
  const recipient = recipientFrom(body.recipient_name, body.recipient_phone);
  if (recipient.error) return NextResponse.json({ error: recipient.error }, { status: 400 });
  const subtotal = box.price * qty;
  const ship_fee = shipFeeFor(box.size, qty);
  const [order] = await db.insert(orders).values({ user_id: user.id, box_id: box.id, quantity: qty, type: "group", status: "placed", subtotal, ship_fee, total: subtotal + ship_fee, cluster_id: group.cluster_id, address, delivery_date: group.delivery_date, group_order_id: group.id, care_message: careMessageOr(body.care_message, group.id + user.id), recipient_name: recipient.recipient_name, recipient_phone: recipient.recipient_phone, payment_method: recipient.recipient_name || body.payment_method === "transfer" ? "transfer" : "cod", payment_status: "pending" }).returning();
  await syncGroupCount(id);
  return NextResponse.json(order, { status: 201 });
}
