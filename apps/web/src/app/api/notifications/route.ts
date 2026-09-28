import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { broadcasts, farms, harvest_commands, harvest_runs, orders } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { COMMAND_CATEGORY } from "@/lib/commands";
import { addDays, todayVN } from "@/lib/commerce";
import { ORDER_STATUS_LABELS } from "@xanhtantay/types";

export const dynamic = "force-dynamic";

export interface AppNotification { id: string; title: string; body: string; url: string; category?: string; data?: Record<string, string> }

/**
 * Recent notifications for this visitor: admin broadcasts for everyone, plus the signed-in user's
 * harvest commands or order updates (no push service involved).
 * Clients poll this and show a local notification for every id they have not seen yet, so
 * harvest commands and order updates still arrive where FCM / APNs / Web Push are unavailable.
 */
export async function GET(req: Request) {
  const platform = new URL(req.url).searchParams.get("platform") === "mobile" ? "mobile" : "web";
  const user = await getSessionUser();
  const since = addDays(todayVN(), -1);
  const out: AppNotification[] = [];

  // Admin broadcasts of the last day reach everyone, signed in or not.
  const sent = await db.select().from(broadcasts).where(and(gte(broadcasts.created_at, new Date(Date.now() - 864e5)), inArray(broadcasts.target, ["all", platform]))).orderBy(desc(broadcasts.created_at)).limit(10);
  for (const b of sent) out.push({ id: `bc-${b.id}`, title: b.title, body: b.body, url: b.url ?? "/" });
  if (!user) return NextResponse.json({ notifications: out }, { headers: { "Cache-Control": "no-store" } });

  if (user.role === "farmer") {
    const rows = await db
      .select({ c: harvest_commands })
      .from(harvest_commands)
      .innerJoin(farms, eq(farms.id, harvest_commands.farm_id))
      .innerJoin(harvest_runs, eq(harvest_runs.id, harvest_commands.run_id))
      .where(and(eq(farms.owner_id, user.id), eq(harvest_commands.status, "sent"), gte(harvest_runs.delivery_date, since)))
      .orderBy(desc(harvest_commands.created_at))
      .limit(5);
    for (const { c } of rows) out.push({ id: `cmd-${c.id}`, title: "Lệnh thu hoạch mới", body: c.message, url: "/farmer", category: COMMAND_CATEGORY, data: { commandId: c.id } });
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
