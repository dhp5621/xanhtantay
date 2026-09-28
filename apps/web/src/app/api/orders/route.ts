import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boxes, callName, clusters, orders, users } from "@/db/schema";
import { pushToUsers } from "@/lib/push";
import { orderNotice } from "@/lib/messages";
import { getSessionUser } from "@/lib/session";
import { getOrdersForUser } from "@/lib/queries";
import { careMessageFor, impactFor, nextDeliveryDate, SHIP_FEE } from "@/lib/commerce";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  return NextResponse.json(await getOrdersForUser(user.id));
}

/**
 * POST { box_id, quantity?, cluster_id, address?, note? } — a one-off box.
 * Ordered before 18:00 → delivered tomorrow, after → the day after. Subscriptions and groups have their own routes.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role === "farmer") return NextResponse.json({ error: "Tài khoản nhà vườn không đặt hộp rau" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { box_id?: string; quantity?: number; cluster_id?: string; address?: string; note?: string };
  const qty = Math.round(Number(body.quantity ?? 1));
  if (!body.box_id) return NextResponse.json({ error: "Chưa chọn hộp rau" }, { status: 400 });
  if (!Number.isFinite(qty) || qty < 1 || qty > 20) return NextResponse.json({ error: "Số lượng từ 1 đến 20 hộp" }, { status: 400 });

  const [box] = await db.select().from(boxes).where(eq(boxes.id, body.box_id));
  if (!box || !box.active) return NextResponse.json({ error: "Hộp rau này đang tạm ngừng" }, { status: 400 });
  const [me] = await db.select().from(users).where(eq(users.id, user.id));
  const clusterId = body.cluster_id ?? me?.cluster_id ?? null;
  if (!clusterId) return NextResponse.json({ error: "Chọn chung cư nhận hàng" }, { status: 400 });
  const [cluster] = await db.select().from(clusters).where(eq(clusters.id, clusterId));
  if (!cluster) return NextResponse.json({ error: "Chung cư không hợp lệ" }, { status: 400 });
  const address = (body.address ?? me?.address ?? "").toString().trim().slice(0, 120) || null;

  const subtotal = box.price * qty;
  const delivery_date = nextDeliveryDate();
  const [order] = await db.insert(orders).values({
    user_id: user.id, box_id: box.id, quantity: qty, type: "single", status: "placed",
    subtotal, ship_fee: SHIP_FEE, total: subtotal + SHIP_FEE,
    note: typeof body.note === "string" ? body.note.slice(0, 200) : null,
    cluster_id: cluster.id, address, delivery_date,
    care_message: careMessageFor(`${user.id}${Date.now()}`),
  }).returning();

  // Remember the building and flat for next time.
  if (me && (me.cluster_id !== cluster.id || (address && me.address !== address))) await db.update(users).set({ cluster_id: cluster.id, address: address ?? me.address }).where(eq(users.id, user.id));

  // Best-effort: a polite confirmation that opens this order when tapped.
  const [who] = await db.select({ name: callName }).from(users).where(eq(users.id, user.id));
  await pushToUsers([user.id], { ...orderNotice({ name: who?.name ?? "bạn", role: "customer" }, "placed"), url: `/don-hang/${order.id}` });
  return NextResponse.json({ ...order, box: { name: box.name, size: box.size, slug: box.slug }, cluster, impact: impactFor(order.subtotal, Number(box.weight_kg) * qty, box.servings, box.days) }, { status: 201 });
}
