import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { callName, change_requests, farm_capacity, farms, produce, users, type CapacityChange, type FarmChange, type ProduceProposal } from "@/db/schema";
import { decisionNotice } from "./messages";
import { pushToUsers } from "./push";

export type RequestKind = "farm" | "capacity" | "produce";
export const FARM_FIELD_LABELS: Record<keyof FarmChange, string> = { name: "Tên vườn", location: "Địa chỉ vườn", province: "Tỉnh", description: "Giới thiệu vườn" };

/** The farm's open request of that kind and, if the last one was turned down recently, why. */
export async function requestState(farmId: string, kind: RequestKind) {
  const rows = await db.select().from(change_requests).where(and(eq(change_requests.farm_id, farmId), eq(change_requests.kind, kind))).orderBy(desc(change_requests.created_at)).limit(3);
  const pending = rows.find((r) => r.status === "pending") ?? null;
  const last = rows.find((r) => r.status !== "pending") ?? null;
  const weekAgo = Date.now() - 7 * 864e5;
  return {
    pending: pending ? { id: pending.id, payload: pending.payload, created_at: pending.created_at } : null,
    rejected: !pending && last?.status === "rejected" && (last.reviewed_at?.getTime() ?? 0) > weekAgo ? { note: last.note, reviewed_at: last.reviewed_at } : null,
  };
}

/** Files the request, replacing the farm's open one of the same kind. */
export async function fileRequest(farmId: string, kind: RequestKind, payload: FarmChange | CapacityChange | ProduceProposal) {
  // Proposals for new produce stand side by side; the other kinds keep one open request.
  if (kind !== "produce") await db.delete(change_requests).where(and(eq(change_requests.farm_id, farmId), eq(change_requests.kind, kind), eq(change_requests.status, "pending")));
  const [row] = await db.insert(change_requests).values({ farm_id: farmId, kind, payload }).returning();
  return row;
}

export async function withdrawRequest(farmId: string, kind: RequestKind) {
  await db.delete(change_requests).where(and(eq(change_requests.farm_id, farmId), eq(change_requests.kind, kind), eq(change_requests.status, "pending")));
}

/** The operator's decision. Approving is the only place a farm or its supply actually changes. */
export async function reviewRequest(id: string, action: "approve" | "reject", note?: string) {
  const [row] = await db.select({ r: change_requests, owner: farms.owner_id, farmer: callName }).from(change_requests).innerJoin(farms, eq(change_requests.farm_id, farms.id)).leftJoin(users, eq(farms.owner_id, users.id)).where(eq(change_requests.id, id));
  if (!row) return { ok: false as const, status: 404, error: "Không tìm thấy yêu cầu" };
  if (row.r.status !== "pending") return { ok: false as const, status: 409, error: "Yêu cầu này đã được xử lý" };
  if (action === "approve") {
    if (row.r.kind === "farm") {
      const p = row.r.payload as FarmChange;
      await db.update(farms).set({ ...(p.name ? { name: p.name } : {}), ...(p.location ? { location: p.location } : {}), ...(p.province ? { province: p.province } : {}), ...("description" in p ? { description: p.description ?? null } : {}) }).where(eq(farms.id, row.r.farm_id));
    } else if (row.r.kind === "produce") {
      // The new produce joins the platform's list and the farm starts supplying it.
      const p = row.r.payload as ProduceProposal;
      const [made] = await db.insert(produce).values({ name: p.name, category: p.category, image_url: p.image_url }).returning();
      await db.insert(farm_capacity).values({ farm_id: row.r.farm_id, produce_id: made.id, daily_kg: p.daily_kg });
    } else {
      const mine = await db.select().from(farm_capacity).where(eq(farm_capacity.farm_id, row.r.farm_id));
      for (const c of row.r.payload as CapacityChange) {
        const have = mine.find((m) => m.produce_id === c.produce_id);
        if (c.to_kg === 0) { if (have) await db.delete(farm_capacity).where(eq(farm_capacity.id, have.id)); }
        else if (have) await db.update(farm_capacity).set({ daily_kg: c.to_kg }).where(eq(farm_capacity.id, have.id));
        else await db.insert(farm_capacity).values({ farm_id: row.r.farm_id, produce_id: c.produce_id, daily_kg: c.to_kg });
      }
    }
  }
  const reason = (note ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || null;
  await db.update(change_requests).set({ status: action === "approve" ? "approved" : "rejected", note: reason, reviewed_at: new Date() }).where(eq(change_requests.id, id));
  const url = row.r.kind === "farm" ? "/farmer/vuon" : "/farmer/nang-suat";
  await pushToUsers([row.owner], { ...decisionNotice({ name: row.farmer ?? "bác", role: "farmer" }, row.r.kind, action === "approve", reason), url });
  return { ok: true as const, kind: row.r.kind, action };
}

/** Decisions of the last day, for the farmer's polled notifications. */
export async function recentDecisions(ownerId: string) {
  return db.select({ r: change_requests }).from(change_requests).innerJoin(farms, eq(change_requests.farm_id, farms.id)).where(and(eq(farms.owner_id, ownerId), gte(change_requests.reviewed_at, new Date(Date.now() - 864e5)))).orderBy(desc(change_requests.reviewed_at)).limit(5);
}

/** The farm's proposals for new produce: open ones, and those decided within the last week. */
export async function produceProposals(farmId: string) {
  const rows = await db.select().from(change_requests).where(and(eq(change_requests.farm_id, farmId), eq(change_requests.kind, "produce"))).orderBy(desc(change_requests.created_at)).limit(20);
  const weekAgo = Date.now() - 7 * 864e5;
  return rows.filter((r) => r.status === "pending" || (r.reviewed_at?.getTime() ?? 0) > weekAgo).map((r) => ({ id: r.id, ...(r.payload as ProduceProposal), status: r.status, reason: r.note, created_at: r.created_at }));
}

export async function withdrawProposal(farmId: string, id: string) {
  await db.delete(change_requests).where(and(eq(change_requests.id, id), eq(change_requests.farm_id, farmId), eq(change_requests.kind, "produce"), eq(change_requests.status, "pending")));
}
