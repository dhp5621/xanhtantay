import { NextResponse } from "next/server";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { farms, farm_diary, group_orders, products } from "@/db/schema";

/**
 * Home feed for the mobile app — the same data the web home page (apps/web/src/app/(customer)/page.tsx)
 * queries directly: featured farms, the latest diary posts joined with their farm, open group orders,
 * plus the visitor stats shown on the landing page.
 */
export async function GET() {
  const [allFarms, diaryFeed, openGroups, [f], [p], [g]] = await Promise.all([
    db.select().from(farms).limit(6),
    db
      .select({ entry: farm_diary, farm: { id: farms.id, name: farms.name, slug: farms.slug } })
      .from(farm_diary)
      .leftJoin(farms, eq(farm_diary.farm_id, farms.id))
      .orderBy(desc(farm_diary.created_at))
      .limit(6),
    db
      .select({ group: group_orders, farm: { name: farms.name } })
      .from(group_orders)
      .leftJoin(farms, eq(group_orders.farm_id, farms.id))
      .where(eq(group_orders.status, "open"))
      .limit(3),
    db.select({ c: count() }).from(farms),
    db.select({ c: count() }).from(products),
    db.select({ c: count() }).from(group_orders).where(eq(group_orders.status, "open")),
  ]);

  return NextResponse.json({
    farms: allFarms,
    diary: diaryFeed.map(({ entry, farm }) => ({ ...entry, farm })),
    groups: openGroups.map(({ group, farm }) => ({ ...group, farm_name: farm?.name ?? null })),
    stats: { farms: f.c, products: p.c, groups: g.c },
  });
}
