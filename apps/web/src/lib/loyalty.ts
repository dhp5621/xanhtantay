import { and, count, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { levelFor, pointsFor, treesFor } from "./commerce";

/** Points come from delivered orders only, so nothing is credited before the produce arrives. */
export async function getLoyalty(userId: string) {
  const [[d], [p]] = await Promise.all([
    db.select({ s: sum(orders.total), c: count() }).from(orders).where(and(eq(orders.user_id, userId), eq(orders.status, "delivered"))),
    db.select({ s: sum(orders.total), c: count() }).from(orders).where(and(eq(orders.user_id, userId), eq(orders.status, "harvesting"))),
  ]);
  const deliveredTotal = Number(d.s ?? 0);
  const points = pointsFor(deliveredTotal);
  const pending = pointsFor(Number(p.s ?? 0));
  return { points, pendingPoints: pending, deliveredOrders: d.c, deliveredTotal, trees: treesFor(points), ...levelFor(points) };
}
