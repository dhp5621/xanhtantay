import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, farms } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getLoyalty } from "@/lib/loyalty";
import { FARMER_SHARE } from "@/lib/commerce";

/** Loyalty summary + the recent delivered orders the "Vườn của tôi" page lists. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const [l, recent] = await Promise.all([
    getLoyalty(user.id),
    db
      .select({ o: orders, farm: { name: farms.name, location: farms.location } })
      .from(orders)
      .leftJoin(farms, eq(orders.farm_id, farms.id))
      .where(and(eq(orders.user_id, user.id), eq(orders.status, "delivered")))
      .orderBy(desc(orders.created_at))
      .limit(8),
  ]);
  return NextResponse.json({
    points: l.points,
    pendingPoints: l.pendingPoints,
    level: l.level.name,
    trees: l.trees,
    deliveredOrders: l.deliveredOrders,
    deliveredTotal: l.deliveredTotal,
    toFarmers: Math.round(l.deliveredTotal * FARMER_SHARE),
    recent: recent.map(({ o, farm }) => ({ id: o.id, total: o.total, created_at: o.created_at, farm_name: farm?.name ?? null, farm_location: farm?.location ?? null })),
  });
}
