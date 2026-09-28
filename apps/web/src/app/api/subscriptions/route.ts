import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { boxes, clusters, subscriptions, users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getSubscriptionsForUser } from "@/lib/queries";
import { nextDeliveryDate, FREQUENCY_DAYS } from "@/lib/commerce";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  return NextResponse.json(await getSubscriptionsForUser(user.id));
}

/** POST { box_id, quantity?, frequency?, cluster_id?, address? } — first box arrives on the next delivery day. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role === "farmer") return NextResponse.json({ error: "Tài khoản nhà vườn không đăng ký hộp rau" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { box_id?: string; quantity?: number; frequency?: string; cluster_id?: string; address?: string };
  const qty = Math.round(Number(body.quantity ?? 1));
  const frequency = (body.frequency ?? "weekly") as "weekly" | "biweekly" | "monthly";
  if (!body.box_id) return NextResponse.json({ error: "Chưa chọn hộp rau" }, { status: 400 });
  if (!(frequency in FREQUENCY_DAYS)) return NextResponse.json({ error: "Tần suất không hợp lệ" }, { status: 400 });
  if (!Number.isFinite(qty) || qty < 1 || qty > 10) return NextResponse.json({ error: "Số lượng từ 1 đến 10 hộp" }, { status: 400 });
  const [box] = await db.select().from(boxes).where(eq(boxes.id, body.box_id));
  if (!box || !box.active) return NextResponse.json({ error: "Hộp rau này đang tạm ngừng" }, { status: 400 });
  const [me] = await db.select().from(users).where(eq(users.id, user.id));
  const clusterId = body.cluster_id ?? me?.cluster_id ?? null;
  if (!clusterId) return NextResponse.json({ error: "Chọn chung cư nhận hàng" }, { status: 400 });
  const [cluster] = await db.select().from(clusters).where(eq(clusters.id, clusterId));
  if (!cluster) return NextResponse.json({ error: "Chung cư không hợp lệ" }, { status: 400 });
  const [dup] = await db.select({ id: subscriptions.id }).from(subscriptions).where(and(eq(subscriptions.user_id, user.id), eq(subscriptions.box_id, box.id), eq(subscriptions.active, true)));
  if (dup) return NextResponse.json({ error: "Bạn đã có gói định kỳ cho hộp này rồi" }, { status: 409 });
  const address = (body.address ?? me?.address ?? "").toString().trim().slice(0, 120) || null;
  const [sub] = await db.insert(subscriptions).values({ user_id: user.id, box_id: box.id, quantity: qty, frequency, next_delivery: nextDeliveryDate(), cluster_id: cluster.id, address }).returning();
  if (me && (me.cluster_id !== cluster.id || (address && me.address !== address))) await db.update(users).set({ cluster_id: cluster.id, address: address ?? me.address }).where(eq(users.id, user.id));
  return NextResponse.json({ ...sub, box: { name: box.name, size: box.size, slug: box.slug, price: box.price }, cluster }, { status: 201 });
}

/** PATCH { id, active?, quantity?, frequency?, box_id? } — changes apply to boxes not yet cut off. */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { id?: string; active?: boolean; quantity?: number; frequency?: string; box_id?: string };
  if (!body.id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const [sub] = await db.select().from(subscriptions).where(and(eq(subscriptions.id, body.id), eq(subscriptions.user_id, user.id)));
  if (!sub) return NextResponse.json({ error: "Không tìm thấy gói" }, { status: 404 });
  const patch: Partial<typeof subscriptions.$inferInsert> = {};
  if (typeof body.active === "boolean") { patch.active = body.active; if (body.active && sub.next_delivery < nextDeliveryDate()) patch.next_delivery = nextDeliveryDate(); }
  if (body.quantity !== undefined) { const q = Math.round(Number(body.quantity)); if (q >= 1 && q <= 10) patch.quantity = q; }
  if (body.frequency && body.frequency in FREQUENCY_DAYS) patch.frequency = body.frequency as "weekly" | "biweekly" | "monthly";
  if (body.box_id) { const [b] = await db.select({ id: boxes.id }).from(boxes).where(and(eq(boxes.id, body.box_id), eq(boxes.active, true))); if (b) patch.box_id = b.id; }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 });
  const [row] = await db.update(subscriptions).set(patch).where(eq(subscriptions.id, sub.id)).returning();
  return NextResponse.json(row);
}
