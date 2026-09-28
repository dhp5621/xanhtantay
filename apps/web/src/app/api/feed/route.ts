import { NextResponse } from "next/server";
import { count, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { clusters, farms, orders, users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getBoxes, getFarms, getGroups, getOrdersForUser } from "@/lib/queries";
import { cutoffInstant, nextDeliveryDate, PILOT_CITY, SOURCE_PROVINCES } from "@/lib/commerce";

/** Home screen data for web and mobile: boxes on sale, groups near you, farms, your live order, pilot stats. */
export async function GET() {
  const user = await getSessionUser();
  const [me] = user ? await db.select({ cluster_id: users.cluster_id }).from(users).where(eq(users.id, user.id)) : [];
  const delivery_date = nextDeliveryDate();
  const [boxList, farmList, groups, [f], [c], [kg], mine] = await Promise.all([
    getBoxes(),
    getFarms(),
    getGroups({ onlyOpen: true }),
    db.select({ c: count() }).from(farms),
    db.select({ c: count() }).from(clusters),
    db.select({ s: sum(orders.quantity) }).from(orders).where(eq(orders.status, "delivered")),
    user && user.role !== "farmer" ? getOrdersForUser(user.id) : Promise.resolve([]),
  ]);
  const near = me?.cluster_id ? groups.filter((g) => g.cluster_id === me.cluster_id) : [];
  return NextResponse.json({
    delivery_date, cutoff_at: cutoffInstant(delivery_date).toISOString(),
    pilot: { city: PILOT_CITY, provinces: SOURCE_PROVINCES },
    boxes: boxList,
    farms: farmList,
    groups: [...near, ...groups.filter((g) => !near.includes(g))].slice(0, 6),
    my_cluster_id: me?.cluster_id ?? null,
    live_order: mine.find((o) => o.status !== "delivered" && o.status !== "cancelled") ?? null,
    stats: { farms: f.c, clusters: c.c, boxes_delivered: Number(kg.s ?? 0) },
  });
}
