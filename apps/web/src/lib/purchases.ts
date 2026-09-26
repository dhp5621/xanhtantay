import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, order_items, products, subscriptions } from "@/db/schema";

export interface Purchased { name: string; unit: string; quantity: number; when: Date; order_id: string | null }

/** What this customer actually bought: recent order lines plus active subscription items. */
export async function getPurchases(userId: string, opts?: { orderId?: string; limitOrders?: number }): Promise<Purchased[]> {
  const recent = await db
    .select({ id: orders.id, created_at: orders.created_at })
    .from(orders)
    .where(opts?.orderId ? and(eq(orders.user_id, userId), eq(orders.id, opts.orderId)) : eq(orders.user_id, userId))
    .orderBy(desc(orders.created_at))
    .limit(opts?.limitOrders ?? 5);
  const out: Purchased[] = [];
  if (recent.length) {
    const lines = await db
      .select({ oi: order_items, name: products.name, unit: products.unit })
      .from(order_items)
      .leftJoin(products, eq(order_items.product_id, products.id))
      .where(inArray(order_items.order_id, recent.map((o) => o.id)));
    const when = new Map(recent.map((o) => [o.id, o.created_at]));
    for (const l of lines) if (l.name) out.push({ name: l.name, unit: l.unit ?? "", quantity: Number(l.oi.quantity), when: when.get(l.oi.order_id)!, order_id: l.oi.order_id });
  }
  if (!opts?.orderId) {
    const subs = await db.select().from(subscriptions).where(and(eq(subscriptions.user_id, userId), eq(subscriptions.active, true)));
    const ids = subs.flatMap((s) => s.items.map((i) => i.product_id));
    if (ids.length) {
      const prods = await db.select().from(products).where(inArray(products.id, ids));
      const byId = new Map(prods.map((p) => [p.id, p]));
      for (const s of subs) for (const i of s.items) { const p = byId.get(i.product_id); if (p) out.push({ name: p.name, unit: p.unit, quantity: i.quantity, when: s.next_delivery, order_id: null }); }
    }
  }
  return out;
}

/** Distinct product names, most recent first. */
export const distinctNames = (p: Purchased[]) => Array.from(new Set(p.sort((a, b) => b.when.getTime() - a.when.getTime()).map((x) => x.name)));
