import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, order_items, products } from "@/db/schema";

export interface Purchased { name: string; unit: string; quantity: number; when: Date; order_id: string | null }

/**
 * What this customer has actually received: lines of DELIVERED orders only.
 * Orders still being harvested or shipped are not in the kitchen yet, so they never feed recipes.
 */
export async function getPurchases(userId: string, opts?: { orderId?: string; limitOrders?: number }): Promise<Purchased[]> {
  const delivered = and(eq(orders.user_id, userId), eq(orders.status, "delivered"));
  const recent = await db
    .select({ id: orders.id, created_at: orders.created_at })
    .from(orders)
    .where(opts?.orderId ? and(delivered, eq(orders.id, opts.orderId)) : delivered)
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
  return out;
}

/** Distinct product names, most recent first. */
export const distinctNames = (p: Purchased[]) => Array.from(new Set(p.sort((a, b) => b.when.getTime() - a.when.getTime()).map((x) => x.name)));
