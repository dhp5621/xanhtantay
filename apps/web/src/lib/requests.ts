import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { change_requests, farm_capacity, farms, type CapacityChange, type FarmChange } from "@/db/schema";
import { pushToUsers } from "./push";

export type RequestKind = "farm" | "capacity";
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
export async function fileRequest(farmId: string, kind: RequestKind, payload: FarmChange | CapacityChange) {
  await db.delete(change_requests).where(and(eq(change_requests.farm_id, farmId), eq(change_requests.kind, kind), eq(change_requests.status, "pending")));
  const [row] = await db.insert(change_requests).values({ farm_id: farmId, kind, payload }).returning();
  return row;
}

export async function withdrawRequest(farmId: string, kind: RequestKind) {
  await db.delete(change_requests).where(and(eq(change_requests.farm_id, farmId), eq(change_requests.kind, kind), eq(change_requests.status, "pending")));
}

/** The operator's decision. Approving is the only place a farm or its supply actually changes. */
export async function reviewRequest(id: string, action: "approve" | "reject", note?: string) {
  const [row] = await db.select({ r: change_requests, owner: farms.owner_id }).from(change_requests).innerJoin(farms, eq(change_requests.farm_id, farms.id)).where(eq(change_requests.id, id));
  if (!row) return { ok: false as const, status: 404, error: "Không tìm thấy yêu cầu" };
  if (row.r.status !== "pending") return { ok: false as const, status: 409, error: "Yêu cầu này đã được xử lý" };
  if (action === "approve") {
    if (row.r.kind === "farm") {
      const p = row.r.payload as FarmChange;
      await db.update(farms).set({ ...(p.name ? { name: p.name } : {}), ...(p.location ? { location: p.location } : {}), ...(p.province ? { province: p.province } : {}), ...("description" in p ? { description: p.description ?? null } : {}) }).where(eq(farms.id, row.r.farm_id));
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
  const what = row.r.kind === "farm" ? "thông tin vườn" : "rau củ đăng ký";
  await pushToUsers([row.owner], action === "approve"
    ? { title: "Đã duyệt thay đổi", body: `Thay đổi ${what} của bác đã được duyệt.`, url: row.r.kind === "farm" ? "/farmer/vuon" : "/farmer/nang-suat" }
    : { title: "Thay đổi chưa được duyệt", body: reason ? `Thay đổi ${what}: ${reason}` : `Thay đổi ${what} của bác chưa được duyệt. Bác liên hệ điều phối nhé.`, url: row.r.kind === "farm" ? "/farmer/vuon" : "/farmer/nang-suat" });
  return { ok: true as const, kind: row.r.kind, action };
}

/** Decisions of the last day, for the farmer's polled notifications. */
export async function recentDecisions(ownerId: string) {
  return db.select({ r: change_requests }).from(change_requests).innerJoin(farms, eq(change_requests.farm_id, farms.id)).where(and(eq(farms.owner_id, ownerId), gte(change_requests.reviewed_at, new Date(Date.now() - 864e5)))).orderBy(desc(change_requests.reviewed_at)).limit(5);
}
