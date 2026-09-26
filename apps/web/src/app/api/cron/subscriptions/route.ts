import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, orders, order_items, products } from "@/db/schema";
import { eq, lte, and, inArray } from "drizzle-orm";

// Vercel Cron: runs daily via vercel.json cron config
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  const now = new Date();
  const dueSubs = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.active, true), lte(subscriptions.next_delivery, now)));

  const created: string[] = [];
  for (const sub of dueSubs) {
    const items = sub.items;
    if (!items.length) continue;

    // Bug fix: totals were always 0 because subscription items never store unit_price. Price from products.
    const rows = await db.select().from(products).where(inArray(products.id, items.map((i) => i.product_id)));
    const byId = new Map(rows.map((p) => [p.id, p]));
    const lines = items
      .map((i) => ({ product: byId.get(i.product_id), quantity: i.quantity }))
      .filter((l): l is { product: typeof rows[number]; quantity: number } => !!l.product && l.product.in_stock);
    if (!lines.length) continue;

    const total = lines.reduce((sum, l) => sum + l.product.price_per_unit * l.quantity, 0);

    const [order] = await db.insert(orders).values({
      user_id: sub.user_id,
      farm_id: sub.farm_id,
      type: "subscription",
      status: "harvesting",
      total,
      note: "Đơn tự động từ gói đăng ký",
    }).returning();
    await db.insert(order_items).values(
      lines.map((l) => ({ order_id: order.id, product_id: l.product.id, quantity: String(l.quantity), unit_price: l.product.price_per_unit }))
    );
    created.push(order.id);

    // Advance from *now* so a subscription paused for weeks does not create a burst of catch-up orders.
    const next = new Date(now);
    next.setDate(next.getDate() + (sub.frequency === "weekly" ? 7 : 30));
    await db.update(subscriptions).set({ next_delivery: next }).where(eq(subscriptions.id, sub.id));
  }

  return NextResponse.json({ created: created.length, order_ids: created });
}
