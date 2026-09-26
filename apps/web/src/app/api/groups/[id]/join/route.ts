import { NextResponse } from "next/server";
import { db } from "@/db";
import { group_orders, group_order_members } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const [group] = await db.select().from(group_orders).where(eq(group_orders.id, id));
  if (!group) return NextResponse.json({ error: "Không tìm thấy nhóm" }, { status: 404 });
  if (group.status !== "open") return NextResponse.json({ error: "Nhóm đã đóng" }, { status: 400 });
  if (new Date(group.deadline).getTime() < Date.now()) return NextResponse.json({ error: "Nhóm đã hết hạn chốt đơn" }, { status: 400 });

  // Bug fix: joining twice used to double-count the member.
  const [existing] = await db
    .select({ id: group_order_members.id })
    .from(group_order_members)
    .where(and(eq(group_order_members.group_order_id, id), eq(group_order_members.user_id, user.id)));
  if (existing) return NextResponse.json({ error: "Bạn đã ở trong nhóm này rồi" }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body?.items) ? body.items : [];

  const [member] = await db.insert(group_order_members).values({ group_order_id: id, user_id: user.id, items }).returning();
  await db.update(group_orders).set({ current_members: sql`${group_orders.current_members} + 1` }).where(eq(group_orders.id, id));

  return NextResponse.json(member, { status: 201 });
}
