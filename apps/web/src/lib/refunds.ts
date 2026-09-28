import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { callName, orders, refund_requests, users } from "@/db/schema";
import { pushToUsers } from "./push";
import { ARRIVAL_TIME, vnInstant } from "./commerce";
import { refundNotice } from "./messages";
import { countWords, evidenceRequired, REFUND_MAX_WORDS, REFUND_METHODS, REFUND_PHOTOS, REFUND_REASONS, REFUND_WINDOW_DAYS } from "./refund-config";

export type Refund = typeof refund_requests.$inferSelect;
type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

/** Evidence must be files this platform stored, never arbitrary links. */
const stored = (u: unknown): u is string => typeof u === "string" && u.length < 600 && /^https:\/\/[a-z0-9.-]+\.(public\.)?blob\.vercel-storage\.com\//i.test(u);

export const refundFor = async (orderId: string) => (await db.select().from(refund_requests).where(eq(refund_requests.order_id, orderId)))[0] ?? null;

/** Whether a request may be filed for this order right now, and if not, why. */
export function refundWindow(order: { status: string; delivered_at: Date | null; delivery_date: string }) {
  if (order.status !== "delivered") return { open: false, reason: "Chỉ gửi được yêu cầu sau khi hộp rau đã giao." };
  // An order marked delivered by hand has no recorded time: count from the scheduled arrival, 16h00 on the delivery day.
  const delivered = order.delivered_at ?? vnInstant(order.delivery_date, ARRIVAL_TIME);
  const until = new Date(delivered.getTime() + REFUND_WINDOW_DAYS * 864e5);
  return Date.now() > until.getTime() ? { open: false, until, reason: `Đã quá ${REFUND_WINDOW_DAYS} ngày kể từ khi giao nên không gửi được yêu cầu nữa.` } : { open: true, until, reason: null };
}

export async function fileRefund(orderId: string, userId: string, body: Record<string, unknown>): Promise<Result<Refund>> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order || order.user_id !== userId) return { ok: false, status: 404, error: "Không tìm thấy đơn hàng" };
  const w = refundWindow(order);
  if (!w.open) return { ok: false, status: 400, error: w.reason ?? "Chưa gửi được yêu cầu" };
  if (await refundFor(orderId)) return { ok: false, status: 409, error: "Đơn này đã có yêu cầu trả hàng / hoàn tiền rồi ạ" };

  const reason = String(body.reason ?? "");
  if (!REFUND_REASONS.some((r) => r.value === reason)) return { ok: false, status: 400, error: "Xin chọn lý do giúp ạ" };
  const method = String(body.method ?? "");
  if (!REFUND_METHODS.some((m) => m.value === method)) return { ok: false, status: 400, error: "Xin chọn cách xử lý mong muốn giúp ạ" };
  const description = String(body.description ?? "").trim().slice(0, 2000);
  if (countWords(description) < 3) return { ok: false, status: 400, error: "Xin mô tả rõ hơn tình trạng hộp rau giúp ạ" };
  if (countWords(description) > REFUND_MAX_WORDS) return { ok: false, status: 400, error: `Mô tả tối đa ${REFUND_MAX_WORDS} từ` };
  const photos = Array.isArray(body.photos) ? body.photos.filter(stored).slice(0, REFUND_PHOTOS) : [];
  const video = stored(body.video_url) ? body.video_url : null;
  if (evidenceRequired(reason)) {
    if (photos.length < REFUND_PHOTOS) return { ok: false, status: 400, error: `Cần đủ ${REFUND_PHOTOS} ảnh chụp các góc của hộp rau` };
    if (!video) return { ok: false, status: 400, error: "Cần 1 video quay hộp rau" };
  }
  const [row] = await db.insert(refund_requests).values({ order_id: orderId, user_id: userId, reason, description, photos, video_url: video, method }).returning();
  return { ok: true, value: row };
}

export async function withdrawRefund(orderId: string, userId: string): Promise<Result<null>> {
  const r = await refundFor(orderId);
  if (!r || r.user_id !== userId) return { ok: false, status: 404, error: "Không tìm thấy yêu cầu" };
  if (r.status !== "pending") return { ok: false, status: 409, error: "Yêu cầu đã được xử lý nên không rút được nữa" };
  await db.delete(refund_requests).where(eq(refund_requests.id, r.id));
  // The files stay in the store: the operator removes them from /admin/dung-luong, where they
  // show up as files nothing uses any more.
  return { ok: true, value: null };
}

/** The operator's verdict after verifying the evidence. */
export async function reviewRefund(id: string, input: { action: "approve" | "reject"; resolution?: string; amount?: number; note?: string }): Promise<Result<Refund>> {
  const [row] = await db.select({ r: refund_requests, o: orders, name: callName }).from(refund_requests).innerJoin(orders, eq(refund_requests.order_id, orders.id)).innerJoin(users, eq(refund_requests.user_id, users.id)).where(eq(refund_requests.id, id));
  if (!row) return { ok: false, status: 404, error: "Không tìm thấy yêu cầu" };
  if (row.r.status !== "pending") return { ok: false, status: 409, error: "Yêu cầu này đã được xử lý" };
  const approved = input.action === "approve";
  const resolution = approved ? (REFUND_METHODS.some((m) => m.value === input.resolution) ? input.resolution! : row.r.method) : null;
  const amount = approved && resolution === "refund" ? Math.min(row.o.total, Math.max(0, Math.round(Number(input.amount ?? row.o.total)) || 0)) : null;
  if (approved && resolution === "refund" && !amount) return { ok: false, status: 400, error: "Số tiền hoàn phải lớn hơn 0" };
  const note = (input.note ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || null;
  if (!approved && !note) return { ok: false, status: 400, error: "Xin ghi lý do không chấp nhận để báo cho khách" };
  const [updated] = await db.update(refund_requests).set({ status: approved ? "approved" : "rejected", resolution, refund_amount: amount, note, reviewed_at: new Date() }).where(and(eq(refund_requests.id, id), eq(refund_requests.status, "pending"))).returning();
  await pushToUsers([row.r.user_id], { ...refundNotice({ name: row.name, role: "customer" }, approved, resolution, amount, note), url: `/don-hang/${row.r.order_id}` });
  return { ok: true, value: updated ?? row.r };
}

/** Verdicts of the last day, for the customer's polled notifications. */
export const recentRefundDecisions = (userId: string) => db.select().from(refund_requests).where(and(eq(refund_requests.user_id, userId), gte(refund_requests.reviewed_at, new Date(Date.now() - 864e5)))).orderBy(desc(refund_requests.reviewed_at)).limit(5);
