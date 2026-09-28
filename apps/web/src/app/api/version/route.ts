import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * A cheap change signal: one round trip of aggregate queries folded into a short hash.
 * Web and mobile clients poll it and refetch whenever it changes, so everyone sees new
 * orders, cut-offs, harvest confirmations and group members without reloading.
 */
export async function GET() {
  const result = await db.execute(sql`select
    (select count(*) || ':' || coalesce(max(extract(epoch from created_at)), 0) || ':' || coalesce(sum(case status when 'placed' then 1 when 'harvesting' then 3 when 'loaded' then 7 when 'delivered' then 15 else 31 end), 0) || ':' || coalesce(sum(quantity), 0) || ':' || count(run_id) from orders) as o,
    (select count(*) || ':' || coalesce(sum(case status when 'allocated' then 1 when 'harvesting' then 3 when 'loaded' then 7 else 15 end), 0) || ':' || coalesce(max(extract(epoch from cutoff_at)), 0) from harvest_runs) as r,
    (select count(*) || ':' || coalesce(sum(case status when 'confirmed' then 1 else 0 end), 0) from harvest_commands) as c,
    (select count(*) || ':' || coalesce(sum(current_members), 0) || ':' || coalesce(sum(case status when 'open' then 1 else 0 end), 0) from group_orders) as g,
    (select count(*) || ':' || coalesce(sum(case when active then 1 else 0 end), 0) || ':' || coalesce(sum(quantity), 0) || ':' || coalesce(max(next_delivery)::text, '') from subscriptions) as s,
    (select count(*) || ':' || coalesce(sum(price), 0) || ':' || coalesce(sum(case when active then 1 else 0 end), 0) from boxes) as b,
    (select count(*) || ':' || coalesce(sum(daily_kg), 0) from farm_capacity) as k,
    (select count(*) || ':' || coalesce(sum(length(coalesce(cover_url, '')) + length(name) + length(coalesce(description, ''))), 0) from farms) as f,
    (select count(*) || ':' || coalesce(sum(case status when 'pending' then 1 when 'approved' then 3 else 7 end), 0) || ':' || coalesce(max(extract(epoch from created_at)), 0) from change_requests) as q,
    (select count(*) || ':' || coalesce(sum(case status when 'pending' then 1 when 'approved' then 3 else 7 end), 0) from refund_requests) as rf,
    (select count(*) || ':' || coalesce(sum(length(coalesce(avatar_url, '')) + length(name) + length(coalesce(cluster_id, ''))), 0) from users) as u`);
  const row = Array.isArray(result) ? result[0] : (result as { rows?: unknown[] }).rows?.[0];
  const v = createHash("sha1").update(JSON.stringify(row ?? {})).digest("hex").slice(0, 12);
  return NextResponse.json({ v, at: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
