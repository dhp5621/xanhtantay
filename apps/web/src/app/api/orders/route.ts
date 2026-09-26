import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { orders, order_items } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const myOrders = await db.select().from(orders).where(eq(orders.user_id, userId));
  return NextResponse.json(myOrders);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { farm_id, items, type = "single", note } = body;

  if (!farm_id || !items?.length) {
    return NextResponse.json({ error: "Thiếu thông tin đơn hàng" }, { status: 400 });
  }

  const total = items.reduce(
    (sum: number, item: { unit_price: number; quantity: number }) =>
      sum + item.unit_price * item.quantity,
    0
  );

  const [order] = await db.insert(orders).values({
    user_id: userId,
    farm_id,
    type,
    total,
    note,
    status: "harvesting",
  }).returning();

  await db.insert(order_items).values(
    items.map((item: { product_id: string; quantity: number; unit_price: number }) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: String(item.quantity),
      unit_price: item.unit_price,
    }))
  );

  return NextResponse.json(order, { status: 201 });
}
