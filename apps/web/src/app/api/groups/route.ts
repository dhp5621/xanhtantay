import { NextResponse } from "next/server";
import { db } from "@/db";
import { farms, group_orders, group_order_members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const groups = await db.select().from(group_orders).where(eq(group_orders.status, "open"));
  return NextResponse.json(groups);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { farm_id, title, min_members, deadline, shipping_address } = (body ?? {}) as Record<string, unknown>;

  if (!farm_id || !title || !min_members || !deadline || !shipping_address) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }
  const min = Number(min_members);
  if (!Number.isInteger(min) || min < 2 || min > 50) return NextResponse.json({ error: "Số người tối thiểu từ 2 đến 50" }, { status: 400 });
  const due = new Date(String(deadline));
  if (Number.isNaN(due.getTime())) return NextResponse.json({ error: "Hạn chốt không hợp lệ" }, { status: 400 });
  due.setHours(23, 59, 59, 0);
  if (due.getTime() < Date.now()) return NextResponse.json({ error: "Hạn chốt phải ở tương lai" }, { status: 400 });

  const [farm] = await db.select({ id: farms.id }).from(farms).where(eq(farms.id, String(farm_id)));
  if (!farm) return NextResponse.json({ error: "Vườn không tồn tại" }, { status: 400 });

  // Creator automatically becomes the first member.
  const [group] = await db.insert(group_orders).values({
    farm_id: farm.id,
    title: String(title).slice(0, 80),
    min_members: min,
    deadline: due,
    shipping_address: String(shipping_address).slice(0, 160),
    status: "open",
    current_members: 1,
  }).returning();
  await db.insert(group_order_members).values({ group_order_id: group.id, user_id: user.id, items: [] });

  return NextResponse.json(group, { status: 201 });
}
