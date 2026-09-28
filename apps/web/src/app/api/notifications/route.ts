import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { farms, harvest_commands, harvest_runs, orders } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { addDays, todayVN } from "@/lib/commerce";
import { ORDER_STATUS_LABELS } from "@xanhtantay/types";

export const dynamic = "force-dynamic";

export interface AppNotification { id: string; title: string; body: string; url: string }

/**
 * The signed-in user's recent notifications, derived from live data (no push service involved).
 * Clients poll this and show a local notification for every id they have not seen yet, so
 * harvest commands and order updates still arrive where FCM / APNs / Web Push are unavailable.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ notifications: [] }, { headers: { "Cache-Control": "no-store" } });
  const since = addDays(todayVN(), -1);
  const out: AppNotification[] = [];

  if (user.role === "farmer") {
    const rows = await db
      .select({ c: harvest_commands })
      .from(harvest_commands)
      .innerJoin(farms, eq(farms.id, harvest_commands.farm_id))
      .innerJoin(harvest_runs, eq(harvest_runs.id, harvest_commands.run_id))
      .where(and(eq(farms.owner_id, user.id), eq(harvest_commands.status, "sent"), gte(harvest_runs.delivery_date, since)))
      .orderBy(desc(harvest_commands.created_at))
      .limit(5);
    for (const { c } of rows) out.push({ id: `cmd-${c.id}`, title: "Lệnh thu hoạch mới", body: c.message, url: "/farmer" });
  } else {
    const rows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.user_id, user.id), inArray(orders.status, ["harvesting", "loaded", "delivered"]), gte(orders.delivery_date, since)))
      .orderBy(desc(orders.delivery_date))
      .limit(10);
    for (const o of rows) out.push({ id: `ord-${o.id}-${o.status}`, title: "Hộp rau của bạn", body: ORDER_STATUS_LABELS[o.status], url: `/don-hang/${o.id}` });
  }
  return NextResponse.json({ notifications: out }, { headers: { "Cache-Control": "no-store" } });
}
