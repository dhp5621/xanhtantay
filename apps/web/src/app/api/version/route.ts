import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * A cheap change signal: one round trip of aggregate queries folded into a short hash.
 * Web and mobile clients poll it and refetch whenever it changes, so everyone sees new
 * orders, status changes, diary posts, stock and group members without reloading.
 */
export async function GET() {
  const result = await db.execute(sql`select
    (select count(*) || ':' || coalesce(max(extract(epoch from created_at)), 0) || ':' || coalesce(sum(case status when 'harvesting' then 1 when 'loaded' then 3 else 7 end), 0) from orders) as o,
    (select count(*) || ':' || coalesce(max(extract(epoch from created_at)), 0) from farm_diary) as d,
    (select count(*) || ':' || coalesce(sum(stock_qty), 0) || ':' || coalesce(sum(price_per_unit), 0) || ':' || coalesce(sum(case when in_stock then 1 else 0 end), 0) || ':' || coalesce(sum(length(coalesce(image_url, '')) + length(name)), 0) from products) as p,
    (select count(*) || ':' || coalesce(sum(current_members), 0) || ':' || coalesce(sum(case status when 'open' then 1 else 0 end), 0) from group_orders) as g,
    (select count(*) || ':' || coalesce(sum(case when active then 1 else 0 end), 0) || ':' || coalesce(max(extract(epoch from next_delivery)), 0) from subscriptions) as s,
    (select count(*) || ':' || coalesce(max(extract(epoch from created_at)), 0) from meal_plans) as m,
    (select count(*) || ':' || coalesce(sum(length(coalesce(cover_url, '')) + length(name) + length(coalesce(description, ''))), 0) from farms) as f,
    (select count(*) || ':' || coalesce(sum(length(coalesce(avatar_url, '')) + length(name)), 0) from users) as u`);
  const row = Array.isArray(result) ? result[0] : (result as { rows?: unknown[] }).rows?.[0];
  const v = createHash("sha1").update(JSON.stringify(row ?? {})).digest("hex").slice(0, 12);
  return NextResponse.json({ v, at: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
