import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boxes, clusters, group_orders, orders, users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getGroups, syncGroupCount } from "@/lib/queries";
import { addDays, careMessageOr, nextDeliveryDate, SHIP_FEE } from "@/lib/commerce";

/** GET ?cluster_id= — open groups (all, or for one building). */
export async function GET(req: Request) {
  const clusterId = new URL(req.url).searchParams.get("cluster_id");
  return NextResponse.json(await getGroups({ clusterId, onlyOpen: true }));
}

/** POST { box_id, cluster_id?, title, min_members, delivery_date?, quantity?, address?, care_message? } — creator joins automatically. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role === "farmer") return NextResponse.json({ error: "Tài khoản nhà vườn không tạo nhóm" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { box_id?: string; cluster_id?: string; title?: string; min_members?: number; delivery_date?: string; quantity?: number; address?: string; care_message?: string };
  const [me] = await db.select().from(users).where(eq(users.id, user.id));
  const clusterId = body.cluster_id ?? me?.cluster_id;
  if (!body.box_id || !clusterId || !body.title?.trim()) return NextResponse.json({ error: "Thiếu hộp rau, chung cư hoặc tên nhóm" }, { status: 400 });
  const min = Math.round(Number(body.min_members ?? 3));
  if (min < 2 || min > 50) return NextResponse.json({ error: "Số nhà tối thiểu từ 2 đến 50" }, { status: 400 });
  const earliest = nextDeliveryDate();
  const date = body.delivery_date && /^\d{4}-\d{2}-\d{2}$/.test(body.delivery_date) ? body.delivery_date : earliest;
  if (date < earliest || date > addDays(earliest, 14)) return NextResponse.json({ error: "Ngày giao phải trong 2 tuần tới và chưa qua giờ chốt sổ" }, { status: 400 });
  const [[box], [cluster]] = await Promise.all([db.select().from(boxes).where(eq(boxes.id, body.box_id)), db.select().from(clusters).where(eq(clusters.id, clusterId))]);
  if (!box || !box.active || !cluster) return NextResponse.json({ error: "Hộp rau hoặc chung cư không hợp lệ" }, { status: 400 });
  const qty = Math.min(20, Math.max(1, Math.round(Number(body.quantity ?? 1))));
  const address = (body.address ?? me?.address ?? "").toString().trim().slice(0, 120) || null;

  const [group] = await db.insert(group_orders).values({ cluster_id: cluster.id, box_id: box.id, title: body.title.trim().slice(0, 80), min_members: min, current_members: 0, delivery_date: date, created_by: user.id }).returning();
  const subtotal = box.price * qty;
  await db.insert(orders).values({ user_id: user.id, box_id: box.id, quantity: qty, type: "group", status: "placed", subtotal, ship_fee: SHIP_FEE, total: subtotal + SHIP_FEE, cluster_id: cluster.id, address, delivery_date: date, group_order_id: group.id, care_message: careMessageOr(body.care_message, group.id + user.id) });
  await syncGroupCount(group.id);
  return NextResponse.json({ ...group, current_members: 1 }, { status: 201 });
}
