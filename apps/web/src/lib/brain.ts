import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { boxes, box_items, farm_capacity, farms, group_orders, harvest_commands, harvest_runs, orders, produce, subscriptions, users, type CommandItem } from "@/db/schema";
import { addDays, careMessageFor, commandMessage, FREQUENCY_DAYS, formatKg, formatYMD, SHIP_FEE, vnInstant, HARVEST_TIME, PICKUP_TIME, ARRIVAL_TIME } from "./commerce";
import { aiConfigured, chatJSON } from "./ai";

const STEP = 0.5; // kg granularity of a harvest command
const round = (n: number) => Math.round(n * 10) / 10;

export interface DemandLine { produce_id: string; name: string; kg: number; capacity_kg: number; allocated_kg: number; shortage_kg: number }
export interface Allocation { farm_id: string; farm_name: string; farmer_name: string; owner_id: string; items: CommandItem[]; total_kg: number }

/** Σ(order quantity × box recipe) per produce for the given orders. */
export async function demandFor(orderRows: { box_id: string; quantity: number }[]) {
  const boxIds = Array.from(new Set(orderRows.map((o) => o.box_id)));
  if (!boxIds.length) return new Map<string, number>();
  const items = await db.select().from(box_items).where(inArray(box_items.box_id, boxIds));
  const demand = new Map<string, number>();
  for (const o of orderRows) for (const it of items) if (it.box_id === o.box_id) demand.set(it.produce_id, round((demand.get(it.produce_id) ?? 0) + Number(it.quantity_kg) * o.quantity));
  return demand;
}

/**
 * Split each produce's demand across farms in proportion to registered capacity, in 0.5 kg steps,
 * never above a farm's capacity. Total commanded = total demand, so nothing is harvested in surplus.
 */
export async function allocate(demand: Map<string, number>): Promise<{ lines: DemandLine[]; allocations: Allocation[] }> {
  const [caps, prods, farmRows] = await Promise.all([
    db.select().from(farm_capacity),
    db.select().from(produce),
    db.select({ id: farms.id, name: farms.name, owner_id: farms.owner_id, farmer: users.name }).from(farms).leftJoin(users, eq(farms.owner_id, users.id)),
  ]);
  const nameOf = new Map(prods.map((p) => [p.id, p.name]));
  const byFarm = new Map<string, Allocation>();
  const lines: DemandLine[] = [];

  for (const [produceId, kg] of demand) {
    const growers = caps.filter((c) => c.produce_id === produceId && c.daily_kg > 0);
    const capacity = growers.reduce((s, c) => s + c.daily_kg, 0);
    const target = Math.min(kg, capacity);
    // proportional share, floored to the step
    const shares = growers.map((g) => {
      const exact = capacity ? (target * g.daily_kg) / capacity : 0;
      const base = Math.min(g.daily_kg, Math.floor(exact / STEP) * STEP);
      return { g, base, frac: exact - base };
    });
    let rest = round(target - shares.reduce((s, x) => s + x.base, 0));
    // hand out the remainder by largest fraction, respecting capacity
    for (const s of [...shares].sort((a, b) => b.frac - a.frac)) {
      if (rest <= 0) break;
      const room = s.g.daily_kg - s.base;
      const add = Math.min(room, rest < STEP ? rest : STEP * Math.ceil(Math.min(rest, STEP) / STEP));
      if (add > 0) { s.base = round(s.base + add); rest = round(rest - add); }
    }
    // anything still left (rounding) goes to whoever has room
    for (const s of shares) { if (rest <= 0) break; const add = Math.min(s.g.daily_kg - s.base, rest); if (add > 0) { s.base = round(s.base + add); rest = round(rest - add); } }

    const allocated = round(shares.reduce((s, x) => s + x.base, 0));
    lines.push({ produce_id: produceId, name: nameOf.get(produceId) ?? "?", kg, capacity_kg: capacity, allocated_kg: allocated, shortage_kg: round(kg - allocated) });
    for (const s of shares) {
      if (s.base <= 0) continue;
      const f = farmRows.find((x) => x.id === s.g.farm_id);
      if (!f) continue;
      const a = byFarm.get(f.id) ?? { farm_id: f.id, farm_name: f.name, farmer_name: f.farmer ?? f.name, owner_id: f.owner_id, items: [], total_kg: 0 };
      a.items.push({ produce_id: produceId, name: nameOf.get(produceId) ?? "?", kg: s.base });
      a.total_kg = round(a.total_kg + s.base);
      byFarm.set(f.id, a);
    }
  }
  lines.sort((a, b) => b.kg - a.kg);
  const allocations = Array.from(byFarm.values()).map((a) => ({ ...a, items: a.items.sort((x, y) => y.kg - x.kg) })).sort((a, b) => b.total_kg - a.total_kg);
  return { lines, allocations };
}

/** Live picture before the cut-off: what would be commanded if we closed the book now. */
export async function previewFor(deliveryDate: string) {
  const [placed, subs] = await Promise.all([
    db.select({ id: orders.id, box_id: orders.box_id, quantity: orders.quantity, type: orders.type, cluster_id: orders.cluster_id }).from(orders).where(and(eq(orders.delivery_date, deliveryDate), eq(orders.status, "placed"))),
    db.select({ id: subscriptions.id, box_id: subscriptions.box_id, quantity: subscriptions.quantity }).from(subscriptions).where(and(eq(subscriptions.active, true), lte(subscriptions.next_delivery, deliveryDate))),
  ]);
  // subscriptions already materialised as an order for this date must not be counted twice
  const materialised = await db.select({ sid: orders.subscription_id }).from(orders).where(and(eq(orders.delivery_date, deliveryDate), sql`${orders.subscription_id} is not null`));
  const done = new Set(materialised.map((m) => m.sid));
  const dueSubs = subs.filter((s) => !done.has(s.id));
  const all = [...placed.map((o) => ({ box_id: o.box_id, quantity: o.quantity })), ...dueSubs.map((s) => ({ box_id: s.box_id, quantity: s.quantity }))];
  const demand = await demandFor(all);
  const { lines, allocations } = await allocate(demand);
  return {
    delivery_date: deliveryDate,
    orders: placed.length, subscriptions_due: dueSubs.length,
    boxes: all.reduce((s, o) => s + o.quantity, 0),
    total_kg: round(lines.reduce((s, l) => s + l.kg, 0)),
    shortage_kg: round(lines.reduce((s, l) => s + l.shortage_kg, 0)),
    lines, allocations,
  };
}

/**
 * The 18:00 cut-off for one delivery date: materialise due subscriptions, settle group orders,
 * aggregate demand, allocate to farms, write one harvest command per farm, attach orders to the run.
 * Re-running is allowed while the run has not started harvesting (commands are rebuilt).
 */
export async function runCutoff(deliveryDate: string) {
  const [existing] = await db.select().from(harvest_runs).where(eq(harvest_runs.delivery_date, deliveryDate));
  if (existing && existing.status !== "allocated") throw new Error("Chuyến này đã bắt đầu thu hoạch, không chốt lại được");

  // 1. subscriptions due → orders (free delivery), then move their next date on
  const due = await db.select().from(subscriptions).where(and(eq(subscriptions.active, true), lte(subscriptions.next_delivery, deliveryDate)));
  if (due.length) {
    const priced = await db.select({ id: boxes.id, price: boxes.price }).from(boxes).where(inArray(boxes.id, due.map((d) => d.box_id)));
    const priceOf = new Map(priced.map((b) => [b.id, b.price]));
    for (const s of due) {
      const [already] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.subscription_id, s.id), eq(orders.delivery_date, deliveryDate)));
      if (!already) {
        const subtotal = (priceOf.get(s.box_id) ?? 0) * s.quantity;
        await db.insert(orders).values({ user_id: s.user_id, box_id: s.box_id, quantity: s.quantity, type: "subscription", status: "placed", subtotal, ship_fee: 0, total: subtotal, cluster_id: s.cluster_id, address: s.address, delivery_date: deliveryDate, subscription_id: s.id, care_message: careMessageFor(s.id + deliveryDate), note: "Đơn tự động từ gói định kỳ" });
      }
      let next = s.next_delivery;
      while (next <= deliveryDate) next = addDays(next, FREQUENCY_DAYS[s.frequency] ?? 7);
      await db.update(subscriptions).set({ next_delivery: next }).where(eq(subscriptions.id, s.id));
    }
  }

  // 2. group orders for this date: enough members ⇒ free delivery for everyone in the group
  const groups = await db.select().from(group_orders).where(and(eq(group_orders.delivery_date, deliveryDate), eq(group_orders.status, "open")));
  for (const g of groups) {
    const full = g.current_members >= g.min_members;
    await db.update(orders).set(full ? { ship_fee: 0, total: sql`${orders.subtotal}` } : { ship_fee: SHIP_FEE, total: sql`${orders.subtotal} + ${SHIP_FEE}` }).where(and(eq(orders.group_order_id, g.id), eq(orders.status, "placed")));
    await db.update(group_orders).set({ status: "locked" }).where(eq(group_orders.id, g.id));
  }

  // 3. demand → allocation
  const placed = await db.select().from(orders).where(and(eq(orders.delivery_date, deliveryDate), eq(orders.status, "placed")));
  const demand = await demandFor(placed.map((o) => ({ box_id: o.box_id, quantity: o.quantity })));
  const { lines, allocations } = await allocate(demand);
  const totalKg = round(lines.reduce((s, l) => s + l.kg, 0));
  const shortage = round(lines.reduce((s, l) => s + l.shortage_kg, 0));
  const totalBoxes = placed.reduce((s, o) => s + o.quantity, 0);
  const summary = await writeSummary(deliveryDate, placed.length, totalBoxes, lines, allocations, shortage);

  // 4. run + commands
  const values = { delivery_date: deliveryDate, status: "allocated" as const, demand: lines.map((l) => ({ produce_id: l.produce_id, name: l.name, kg: l.kg, allocated_kg: l.allocated_kg })), total_kg: String(totalKg), total_orders: placed.length, total_boxes: totalBoxes, shortage_kg: String(shortage), summary, cutoff_at: new Date() };
  let runId: string;
  if (existing) {
    await db.update(harvest_runs).set(values).where(eq(harvest_runs.id, existing.id));
    await db.delete(harvest_commands).where(eq(harvest_commands.run_id, existing.id));
    runId = existing.id;
  } else {
    const [row] = await db.insert(harvest_runs).values(values).returning({ id: harvest_runs.id });
    runId = row.id;
  }
  if (allocations.length) {
    await db.insert(harvest_commands).values(allocations.map((a) => ({ run_id: runId, farm_id: a.farm_id, items: a.items, total_kg: String(a.total_kg), message: commandMessage(a.farmer_name, deliveryDate, a.items) })));
  }
  if (placed.length) await db.update(orders).set({ run_id: runId }).where(inArray(orders.id, placed.map((o) => o.id)));

  return { run_id: runId, delivery_date: deliveryDate, orders: placed.length, boxes: totalBoxes, total_kg: totalKg, shortage_kg: shortage, commands: allocations.length, farmers: allocations.map((a) => a.owner_id), summary };
}

/** Short analyst note for the dashboard. AI if configured, otherwise computed text. */
async function writeSummary(deliveryDate: string, orderCount: number, boxCount: number, lines: DemandLine[], allocations: Allocation[], shortage: number) {
  const totalKg = round(lines.reduce((s, l) => s + l.kg, 0));
  const top = lines.slice(0, 3).map((l) => `${l.name} ${formatKg(l.kg)}`).join(", ");
  const tight = lines.filter((l) => l.capacity_kg > 0 && l.kg / l.capacity_kg >= 0.8).map((l) => `${l.name} (${Math.round((l.kg / l.capacity_kg) * 100)}% năng suất)`);
  const fallback = `Chuyến ${formatYMD(deliveryDate)}: ${orderCount} đơn, ${boxCount} hộp, cần ${formatKg(totalKg)} chia cho ${allocations.length} nông hộ. Nhiều nhất: ${top || "chưa có"}. ${shortage > 0 ? `Thiếu ${formatKg(shortage)} so với năng suất đăng ký, cần bổ sung nông hộ.` : "Lệnh thu hoạch khớp đúng nhu cầu, rau thừa 0%."}${tight.length ? ` Sắp chạm trần: ${tight.join(", ")}.` : ""}`;
  if (!aiConfigured() || !lines.length) return fallback;
  const ai = await chatJSON<{ summary: string }>(
    "Bạn là trợ lý điều phối chuỗi cung ứng nông sản. Viết ngắn gọn, tiếng Việt, không bịa số liệu. Trả về JSON thuần.",
    `Dữ liệu chốt sổ cho ngày giao ${deliveryDate}: ${orderCount} đơn, ${boxCount} hộp, tổng ${totalKg} kg. Nhu cầu theo loại (kg / năng suất đăng ký): ${lines.map((l) => `${l.name} ${l.kg}/${l.capacity_kg}`).join("; ")}. Phân bổ: ${allocations.map((a) => `${a.farm_name} ${a.total_kg} kg`).join("; ")}. Thiếu hụt: ${shortage} kg.
Viết 2–3 câu nhận định: tình hình cung cầu, loại nào sắp chạm trần năng suất, gợi ý cho kế hoạch gieo trồng. JSON: {"summary": "..."}`,
    { temperature: 0.4, timeoutMs: 12_000 }
  );
  return ai?.summary ? String(ai.summary).slice(0, 600) : fallback;
}

const RUN_FLOW = ["allocated", "harvesting", "loaded", "delivered"] as const;
type RunStatus = (typeof RUN_FLOW)[number];

/** Move a run (and every order in it) to the next stage; timestamps follow the published clock times. */
export async function advanceRun(runId: string, to?: RunStatus) {
  const [run] = await db.select().from(harvest_runs).where(eq(harvest_runs.id, runId));
  if (!run) throw new Error("Không tìm thấy chuyến");
  const idx = RUN_FLOW.indexOf(run.status);
  const next = to ?? RUN_FLOW[idx + 1];
  if (!next || RUN_FLOW.indexOf(next) !== idx + 1) throw new Error("Chuyến đã ở bước cuối hoặc bước không hợp lệ");
  const now = new Date();
  // Use the real time if we are past the scheduled time, otherwise the scheduled time (keeps demos believable).
  const at = (hm: string) => { const s = vnInstant(run.delivery_date, hm); return now.getTime() > s.getTime() ? now : s; };
  const patch = next === "harvesting" ? { harvested_at: at(HARVEST_TIME) } : next === "loaded" ? { loaded_at: at(PICKUP_TIME) } : { delivered_at: at(ARRIVAL_TIME) };
  await db.update(harvest_runs).set({ status: next, ...patch }).where(eq(harvest_runs.id, runId));
  await db.update(orders).set({ status: next as "harvesting" | "loaded" | "delivered", ...patch }).where(and(eq(orders.run_id, runId), inArray(orders.status, ["placed", "harvesting", "loaded"])));
  if (next === "delivered") await db.update(group_orders).set({ status: "delivered" }).where(and(eq(group_orders.delivery_date, run.delivery_date), eq(group_orders.status, "locked")));
  const affected = await db.select({ user_id: orders.user_id }).from(orders).where(eq(orders.run_id, runId));
  return { run_id: runId, status: next, customers: Array.from(new Set(affected.map((a) => a.user_id))) };
}

/** Expected demand for the coming days from active subscriptions and orders already placed. */
export async function forecast(fromDate: string, days = 7) {
  const to = addDays(fromDate, days - 1);
  const [subs, placed, items, prods] = await Promise.all([
    db.select().from(subscriptions).where(eq(subscriptions.active, true)),
    db.select({ box_id: orders.box_id, quantity: orders.quantity, delivery_date: orders.delivery_date }).from(orders).where(and(eq(orders.status, "placed"), lte(orders.delivery_date, to))),
    db.select().from(box_items),
    db.select().from(produce),
  ]);
  const kgOfBox = new Map<string, number>();
  for (const it of items) kgOfBox.set(it.box_id, round((kgOfBox.get(it.box_id) ?? 0) + Number(it.quantity_kg)));
  const out = Array.from({ length: days }, (_, i) => ({ date: addDays(fromDate, i), boxes: 0, kg: 0 }));
  const at = (d: string) => out.find((o) => o.date === d);
  for (const o of placed) { const slot = at(o.delivery_date); if (slot) { slot.boxes += o.quantity; slot.kg = round(slot.kg + (kgOfBox.get(o.box_id) ?? 0) * o.quantity); } }
  for (const s of subs) {
    let d = s.next_delivery;
    while (d <= to) { const slot = at(d); if (slot) { slot.boxes += s.quantity; slot.kg = round(slot.kg + (kgOfBox.get(s.box_id) ?? 0) * s.quantity); } d = addDays(d, FREQUENCY_DAYS[s.frequency] ?? 7); }
  }
  return { days: out, produce_count: prods.length };
}
