import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, order_items, products } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const myOrders = await db.select().from(orders).where(eq(orders.user_id, user.id)).orderBy(desc(orders.created_at));
  return NextResponse.json(myOrders);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { farm_id, items, type = "single", note } = (body ?? {}) as {
    farm_id?: string; items?: { product_id: string; quantity: number }[]; type?: string; note?: string;
  };

  if (!farm_id || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Thiếu thông tin đơn hàng" }, { status: 400 });
  }
  if (!["single", "subscription", "group"].includes(type)) {
    return NextResponse.json({ error: "Loại đơn không hợp lệ" }, { status: 400 });
  }

  // Never trust client prices: look products up and check they belong to the farm and are in stock.
  const ids = Array.from(new Set(items.map((i) => i.product_id)));
  const rows = await db.select().from(products).where(inArray(products.id, ids));
  const byId = new Map(rows.map((p) => [p.id, p]));

  const lines: { product_id: string; quantity: number; unit_price: number }[] = [];
  for (const item of items) {
    const p = byId.get(item.product_id);
    const qty = Number(item.quantity);
    if (!p || p.farm_id !== farm_id) return NextResponse.json({ error: "Sản phẩm không thuộc vườn này" }, { status: 400 });
    if (!p.in_stock) return NextResponse.json({ error: `${p.name} đã hết hàng` }, { status: 400 });
    if (!Number.isFinite(qty) || qty <= 0 || qty > 100) return NextResponse.json({ error: "Số lượng không hợp lệ" }, { status: 400 });
    lines.push({ product_id: p.id, quantity: qty, unit_price: p.price_per_unit });
  }

  const total = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);

  const [order] = await db.insert(orders).values({
    user_id: user.id,
    farm_id,
    type: type as "single" | "subscription" | "group",
    total,
    note: typeof note === "string" ? note.slice(0, 200) : undefined,
    status: "harvesting",
  }).returning();

  await db.insert(order_items).values(
    lines.map((l) => ({ order_id: order.id, product_id: l.product_id, quantity: String(l.quantity), unit_price: l.unit_price }))
  );

  return NextResponse.json(order, { status: 201 });
}
