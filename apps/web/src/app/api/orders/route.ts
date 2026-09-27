import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, order_items, products, farms, users } from "@/db/schema";
import { MIN_DIRECT_ORDER, impactFor } from "@/lib/commerce";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  // Farmers see the incoming orders for their own farm (with customer + line items attached)
  // instead of orders they placed themselves as a customer, since the mobile/web farmer console
  // has no separate endpoint for this.
  if (user.role === "farmer") {
    const [myFarm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));
    if (!myFarm) return NextResponse.json([]);
    const farmOrders = await db
      .select({ order: orders, customer_name: users.name, customer_phone: users.phone })
      .from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .where(eq(orders.farm_id, myFarm.id))
      .orderBy(desc(orders.created_at));
    if (farmOrders.length === 0) return NextResponse.json([]);
    const items = await db
      .select({ item: order_items, product_name: products.name, product_unit: products.unit })
      .from(order_items)
      .leftJoin(products, eq(order_items.product_id, products.id))
      .where(inArray(order_items.order_id, farmOrders.map((o) => o.order.id)));
    const byOrder = new Map<string, typeof items>();
    for (const it of items) byOrder.set(it.item.order_id, [...(byOrder.get(it.item.order_id) ?? []), it]);
    return NextResponse.json(
      farmOrders.map(({ order, customer_name, customer_phone }) => ({
        ...order,
        customer_name,
        customer_phone,
        items: (byOrder.get(order.id) ?? []).map((it) => ({ ...it.item, product_name: it.product_name, product_unit: it.product_unit })),
      }))
    );
  }

  // Customers get the same context the web order page renders: farm, farmer name and line items.
  const myOrders = await db
    .select({ order: orders, farm: { name: farms.name, location: farms.location, slug: farms.slug, id: farms.id }, farmer_name: users.name })
    .from(orders)
    .leftJoin(farms, eq(orders.farm_id, farms.id))
    .leftJoin(users, eq(farms.owner_id, users.id))
    .where(eq(orders.user_id, user.id))
    .orderBy(desc(orders.created_at));
  if (myOrders.length === 0) return NextResponse.json([]);
  const lines = await db
    .select({ item: order_items, product_name: products.name, product_unit: products.unit })
    .from(order_items)
    .leftJoin(products, eq(order_items.product_id, products.id))
    .where(inArray(order_items.order_id, myOrders.map((o) => o.order.id)));
  const linesByOrder = new Map<string, typeof lines>();
  for (const it of lines) linesByOrder.set(it.item.order_id, [...(linesByOrder.get(it.item.order_id) ?? []), it]);
  return NextResponse.json(
    myOrders.map(({ order, farm, farmer_name }) => ({
      ...order,
      farm: farm?.id ? farm : null,
      farmer_name,
      items: (linesByOrder.get(order.id) ?? []).map((it) => ({ ...it.item, quantity: Number(it.item.quantity), product_name: it.product_name, product_unit: it.product_unit })),
    }))
  );
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { farm_id, items, type = "single", note, batch_id } = (body ?? {}) as {
    farm_id?: string; items?: { product_id: string; quantity: number }[]; type?: string; note?: string; batch_id?: string;
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
    if (!p.in_stock || p.stock_qty <= 0) return NextResponse.json({ error: `${p.name} đã hết hàng` }, { status: 400 });
    if (!Number.isFinite(qty) || qty <= 0 || qty > 100) return NextResponse.json({ error: "Số lượng không hợp lệ" }, { status: 400 });
    if (qty > p.stock_qty) return NextResponse.json({ error: `${p.name} chỉ còn ${p.stock_qty} ${p.unit}` }, { status: 409 });
    lines.push({ product_id: p.id, quantity: qty, unit_price: p.price_per_unit });
  }

  const total = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  // Small single orders are pooled with neighbours' orders; subscriptions and group orders always ship on schedule.
  const delivery_mode = type === "single" && total < MIN_DIRECT_ORDER ? "pooled" : "direct";
  const [farm] = await db.select({ id: farms.id, name: farms.name, location: farms.location }).from(farms).where(eq(farms.id, farm_id));
  if (!farm) return NextResponse.json({ error: "Vườn không tồn tại" }, { status: 400 });

  // Reserve stock with a conditional decrement so two simultaneous buyers cannot oversell.
  const reserved: { product_id: string; quantity: number }[] = [];
  for (const l of lines) {
    const [row] = await db
      .update(products)
      .set({ stock_qty: sql`${products.stock_qty} - ${l.quantity}` })
      .where(and(eq(products.id, l.product_id), gte(products.stock_qty, l.quantity)))
      .returning({ id: products.id, stock_qty: products.stock_qty });
    if (!row) {
      // Roll back what we already reserved, then report which item ran out.
      for (const r of reserved) {
        await db.update(products).set({ stock_qty: sql`${products.stock_qty} + ${r.quantity}` }).where(eq(products.id, r.product_id));
      }
      const name = byId.get(l.product_id)?.name ?? "Sản phẩm";
      return NextResponse.json({ error: `${name} vừa hết hàng, có người mua trước bạn` }, { status: 409 });
    }
    reserved.push({ product_id: l.product_id, quantity: l.quantity });
    if (row.stock_qty <= 0) await db.update(products).set({ in_stock: false }).where(eq(products.id, l.product_id));
  }

  const [order] = await db.insert(orders).values({
    user_id: user.id,
    farm_id,
    type: type as "single" | "subscription" | "group",
    total,
    note: typeof note === "string" ? note.slice(0, 200) : undefined,
    status: "harvesting",
    delivery_mode,
    batch_id: typeof batch_id === "string" && /^[\w-]{6,64}$/.test(batch_id) ? batch_id : null,
  }).returning();

  await db.insert(order_items).values(
    lines.map((l) => ({ order_id: order.id, product_id: l.product_id, quantity: String(l.quantity), unit_price: l.unit_price }))
  );

  const impact = impactFor(lines.map((l) => ({ quantity: l.quantity, unit: byId.get(l.product_id)!.unit, price_per_unit: l.unit_price })), farm);
  return NextResponse.json({ ...order, farm, impact }, { status: 201 });
}
