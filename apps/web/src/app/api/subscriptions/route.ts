import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const subs = await db.select().from(subscriptions).where(eq(subscriptions.user_id, userId));
  return NextResponse.json(subs);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { farm_id, frequency, items } = body;

  if (!farm_id || !frequency || !items?.length) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }

  const nextDelivery = new Date();
  nextDelivery.setDate(nextDelivery.getDate() + (frequency === "weekly" ? 7 : 30));

  const [sub] = await db.insert(subscriptions).values({
    user_id: userId,
    farm_id,
    frequency,
    next_delivery: nextDelivery,
    items,
    active: true,
  }).returning();

  return NextResponse.json(sub, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { id, items, active } = body;

  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
  if (!sub || sub.user_id !== userId) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (items !== undefined) updateData.items = items;
  if (active !== undefined) updateData.active = active;

  const [updated] = await db
    .update(subscriptions)
    .set(updateData)
    .where(eq(subscriptions.id, id))
    .returning();

  return NextResponse.json(updated);
}
