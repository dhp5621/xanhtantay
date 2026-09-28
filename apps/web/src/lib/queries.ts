import { and, desc, eq, inArray, ne, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { boxes, box_items, clusters, farm_capacity, farms, group_orders, harvest_commands, harvest_runs, orders, produce, subscriptions, users, callName } from "@/db/schema";

export type BoxItemView = { produce_id: string; name: string; image_url: string | null; category: string; quantity_kg: number; farms: { id: string; name: string; slug: string; province: string; location: string }[] };
export type BoxView = Omit<typeof boxes.$inferSelect, "weight_kg"> & { weight_kg: number; items: BoxItemView[] };

/** Boxes with their contents and, for each produce, the farms registered to grow it. */
export async function getBoxes(opts?: { slug?: string; includeInactive?: boolean }): Promise<BoxView[]> {
  const rows = await db.select().from(boxes).where(opts?.slug ? eq(boxes.slug, opts.slug) : opts?.includeInactive ? undefined : eq(boxes.active, true)).orderBy(asc(boxes.mix), asc(boxes.price));
  if (!rows.length) return [];
  const [items, growers] = await Promise.all([
    db.select({ it: box_items, p: produce }).from(box_items).innerJoin(produce, eq(box_items.produce_id, produce.id)).where(inArray(box_items.box_id, rows.map((b) => b.id))),
    db.select({ produce_id: farm_capacity.produce_id, farm: { id: farms.id, name: farms.name, slug: farms.slug, province: farms.province, location: farms.location } }).from(farm_capacity).innerJoin(farms, eq(farm_capacity.farm_id, farms.id)),
  ]);
  return rows.map((b) => ({
    ...b,
    weight_kg: Number(b.weight_kg),
    items: items.filter((x) => x.it.box_id === b.id).map((x) => ({ produce_id: x.p.id, name: x.p.name, image_url: x.p.image_url, category: x.p.category, quantity_kg: Number(x.it.quantity_kg), farms: growers.filter((g) => g.produce_id === x.p.id).map((g) => g.farm) })).sort((a, c) => c.quantity_kg - a.quantity_kg),
  }));
}
export type MixView = { mix: string; name: string; season: string; image_url: string | null; items: BoxItemView[]; sizes: BoxView[] };
/** One entry per mix, each with its sizes from small to large. "Thùng rau mẹ gửi" leads. */
export function groupMixes(list: BoxView[]): MixView[] {
  const out = new Map<string, MixView>();
  for (const b of list) {
    const m = out.get(b.mix) ?? { mix: b.mix, name: b.mix_name, season: b.season, image_url: b.image_url, items: b.items, sizes: [] };
    m.sizes.push(b);
    out.set(b.mix, m);
  }
  const mixes = [...out.values()];
  mixes.forEach((m) => m.sizes.sort((a, c) => a.weight_kg - c.weight_kg));
  return mixes.sort((a, c) => Number(c.mix === "me-gui") - Number(a.mix === "me-gui") || a.name.localeCompare(c.name, "vi"));
}
export const getBox = async (slugOrId: string) => {
  const [bySlug] = await getBoxes({ slug: slugOrId, includeInactive: true });
  if (bySlug) return bySlug;
  const [row] = await db.select({ slug: boxes.slug }).from(boxes).where(eq(boxes.id, slugOrId));
  return row ? (await getBoxes({ slug: row.slug, includeInactive: true }))[0] ?? null : null;
};

export const getClusters = () => db.select().from(clusters).orderBy(asc(clusters.name));

const boxBrief = { id: boxes.id, slug: boxes.slug, name: boxes.name, size: boxes.size, weight_kg: boxes.weight_kg, price: boxes.price, image_url: boxes.image_url, days: boxes.days, servings: boxes.servings };

export async function getOrdersForUser(userId: string) {
  const rows = await db.select({ o: orders, box: boxBrief, cluster: clusters, run: { id: harvest_runs.id, status: harvest_runs.status } })
    .from(orders).innerJoin(boxes, eq(orders.box_id, boxes.id)).leftJoin(clusters, eq(orders.cluster_id, clusters.id)).leftJoin(harvest_runs, eq(orders.run_id, harvest_runs.id))
    .where(eq(orders.user_id, userId)).orderBy(desc(orders.delivery_date), desc(orders.created_at));
  const farmers = await farmersByRun(rows.map((r) => r.o.run_id).filter((x): x is string => !!x));
  return rows.map((r) => ({ ...r.o, box: { ...r.box, weight_kg: Number(r.box.weight_kg) }, cluster: r.cluster, allocated: !!r.run, farmers: r.o.run_id ? farmers.get(r.o.run_id) ?? [] : [] }));
}

/** Who harvested for each run (names used in the emotional tracking line). */
async function farmersByRun(runIds: string[]) {
  const out = new Map<string, { farm_id: string; farm: string; slug: string; farmer: string; location: string; confirmed: boolean; items: { name: string; kg: number }[] }[]>();
  const ids = Array.from(new Set(runIds));
  if (!ids.length) return out;
  const rows = await db.select({ c: harvest_commands, farm: farms, farmer: callName }).from(harvest_commands).innerJoin(farms, eq(harvest_commands.farm_id, farms.id)).leftJoin(users, eq(farms.owner_id, users.id)).where(inArray(harvest_commands.run_id, ids));
  for (const r of rows) out.set(r.c.run_id, [...(out.get(r.c.run_id) ?? []), { farm_id: r.farm.id, farm: r.farm.name, slug: r.farm.slug, farmer: r.farmer ?? r.farm.name, location: r.farm.location, confirmed: r.c.status === "confirmed", items: r.c.items.map((i) => ({ name: i.name, kg: i.kg })) }]);
  return out;
}

/** Everything the QR page shows. Never exposes who bought the box. */
export async function getOrderTrace(id: string) {
  const [row] = await db.select({ o: orders, cluster: clusters, run: harvest_runs }).from(orders).leftJoin(clusters, eq(orders.cluster_id, clusters.id)).leftJoin(harvest_runs, eq(orders.run_id, harvest_runs.id)).where(eq(orders.id, id));
  if (!row) return null;
  const box = await getBox(row.o.box_id);
  if (!box) return null;
  const growers = row.o.run_id ? (await farmersByRun([row.o.run_id])).get(row.o.run_id) ?? [] : [];
  // For each produce in the box: the farms that actually cut it for this run (or, before cut-off, the registered growers).
  const contents = box.items.map((it) => {
    const cut = growers.filter((g) => g.items.some((x) => x.name === it.name));
    return { name: it.name, image_url: it.image_url, quantity_kg: it.quantity_kg * row.o.quantity, farms: cut.length ? cut.map((g) => ({ name: g.farm, slug: g.slug, location: g.location, farmer: g.farmer })) : it.farms.map((f) => ({ name: f.name, slug: f.slug, location: f.location, farmer: null as string | null })) };
  });
  return {
    id: row.o.id, status: row.o.status, type: row.o.type, quantity: row.o.quantity, delivery_date: row.o.delivery_date, created_at: row.o.created_at,
    harvested_at: row.o.harvested_at, loaded_at: row.o.loaded_at, delivered_at: row.o.delivered_at,
    cutoff_at: row.run?.cutoff_at ?? null, allocated: !!row.run,
    cluster: row.cluster ? { name: row.cluster.name, district: row.cluster.district } : null,
    box: { id: box.id, slug: box.slug, name: box.name, size: box.size, weight_kg: box.weight_kg, image_url: box.image_url, days: box.days, servings: box.servings, meal_plan: row.o.meal_plan?.length ? row.o.meal_plan : box.meal_plan, customised: !!row.o.meal_plan?.length },
    contents,
    farms: growers.map((g) => ({ name: g.farm, slug: g.slug, location: g.location, farmer: g.farmer, confirmed: g.confirmed })),
    user_id: row.o.user_id, total: row.o.total, subtotal: row.o.subtotal, ship_fee: row.o.ship_fee, note: row.o.note, care_message: row.o.care_message, address: row.o.address, group_order_id: row.o.group_order_id,
  };
}

export async function getGroups(opts?: { clusterId?: string | null; id?: string; onlyOpen?: boolean }) {
  const conds = [opts?.id ? eq(group_orders.id, opts.id) : undefined, opts?.clusterId ? eq(group_orders.cluster_id, opts.clusterId) : undefined, opts?.onlyOpen ? eq(group_orders.status, "open") : undefined].filter(Boolean) as ReturnType<typeof eq>[];
  const rows = await db.select({ g: group_orders, box: boxBrief, cluster: clusters }).from(group_orders).innerJoin(boxes, eq(group_orders.box_id, boxes.id)).innerJoin(clusters, eq(group_orders.cluster_id, clusters.id))
    .where(conds.length ? and(...conds) : undefined).orderBy(asc(group_orders.delivery_date));
  return rows.map((r) => ({ ...r.g, box: { ...r.box, weight_kg: Number(r.box.weight_kg) }, cluster: r.cluster }));
}

export async function getGroupMembers(groupId: string) {
  return db.select({ id: orders.id, user_id: orders.user_id, quantity: orders.quantity, name: users.name, avatar_url: users.avatar_url, address: orders.address })
    .from(orders).innerJoin(users, eq(orders.user_id, users.id)).where(and(eq(orders.group_order_id, groupId), ne(orders.status, "cancelled"))).orderBy(asc(orders.created_at));
}

/** Keep group_orders.current_members equal to the number of live member orders. */
export async function syncGroupCount(groupId: string) {
  await db.update(group_orders).set({ current_members: sql`(SELECT count(*) FROM orders WHERE orders.group_order_id = ${groupId} AND orders.status <> 'cancelled')` }).where(eq(group_orders.id, groupId));
}

export async function getSubscriptionsForUser(userId: string) {
  const rows = await db.select({ s: subscriptions, box: boxBrief, cluster: clusters }).from(subscriptions).innerJoin(boxes, eq(subscriptions.box_id, boxes.id)).leftJoin(clusters, eq(subscriptions.cluster_id, clusters.id)).where(eq(subscriptions.user_id, userId)).orderBy(desc(subscriptions.created_at));
  return rows.map((r) => ({ ...r.s, box: { ...r.box, weight_kg: Number(r.box.weight_kg) }, cluster: r.cluster }));
}

export async function getFarms(slugOrId?: string) {
  const rows = await db.select({ f: farms, farmer: callName, avatar_url: users.avatar_url }).from(farms).leftJoin(users, eq(farms.owner_id, users.id)).where(slugOrId ? sql`${farms.slug} = ${slugOrId} OR ${farms.id} = ${slugOrId}` : undefined).orderBy(asc(farms.province), asc(farms.name));
  if (!rows.length) return [];
  const caps = await db.select({ c: farm_capacity, p: produce }).from(farm_capacity).innerJoin(produce, eq(farm_capacity.produce_id, produce.id)).where(inArray(farm_capacity.farm_id, rows.map((r) => r.f.id)));
  return rows.map((r) => ({ ...r.f, farmer: r.farmer, farmer_avatar: r.avatar_url, grows: caps.filter((c) => c.c.farm_id === r.f.id).map((c) => ({ produce_id: c.p.id, name: c.p.name, image_url: c.p.image_url, daily_kg: c.c.daily_kg })).sort((a, b) => b.daily_kg - a.daily_kg) }));
}

/** Commands for the farm owned by this user, newest first, with the run's delivery date and stage. */
export async function getCommandsForFarmer(userId: string, limit = 12) {
  const [farm] = await db.select().from(farms).where(eq(farms.owner_id, userId));
  if (!farm) return { farm: null, commands: [] };
  const rows = await db.select({ c: harvest_commands, run: { delivery_date: harvest_runs.delivery_date, status: harvest_runs.status } }).from(harvest_commands).innerJoin(harvest_runs, eq(harvest_commands.run_id, harvest_runs.id)).where(eq(harvest_commands.farm_id, farm.id)).orderBy(desc(harvest_runs.delivery_date)).limit(limit);
  return { farm, commands: rows.map((r) => ({ ...r.c, total_kg: Number(r.c.total_kg), delivery_date: r.run.delivery_date, run_status: r.run.status })) };
}
