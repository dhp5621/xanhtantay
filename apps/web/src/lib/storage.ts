import { del, list } from "@vercel/blob";
import { and, eq, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { boxes, broadcasts, change_requests, farms, produce, refund_requests, users } from "@/db/schema";

/**
 * Keeps the database and the file store from filling up. Nothing is removed on a schedule: the
 * operator looks at the list in /admin/dung-luong and deletes by hand. The one exception is the
 * evidence of a refund request its own customer withdrew. Only data nothing shows any more is
 * ever offered for removal: orders, harvest runs, commands and verdicts are history people still look up,
 * so they are never touched here, however old.
 */
const token = () => process.env.BLOB_READ_WRITE_TOKEN;
const isStored = (u: unknown): u is string => typeof u === "string" && /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(u);

/** A file uploaded moments ago may belong to a form that is about to be sent. */
const ORPHAN_AFTER_MS = 24 * 3600 * 1000;
/** Evidence of a decided return / refund request is kept this long for disputes, then removed. */
export const EVIDENCE_KEEP_DAYS = 60;
/** Decided change requests (with their photos) are history after this long. */
export const REQUEST_KEEP_DAYS = 30;
export const BROADCAST_KEEP_DAYS = 7;
export const FILE_LIMIT_BYTES = 1024 ** 3;
export const DB_LIMIT_BYTES = Number(process.env.DB_LIMIT_MB ?? 512) * 1024 * 1024;

export type CleanupKey = "orphans" | "evidence" | "requests" | "broadcasts";
export interface CleanupItem { key: CleanupKey; label: string; what: string; count: number; bytes: number | null; examples: string[]; available: boolean }

/** Best-effort: a failed delete is picked up by the next clean-up. */
export async function removeFiles(urls: (string | null | undefined)[]) {
  const mine = urls.filter(isStored);
  if (!mine.length || !token()) return 0;
  try {
    await del(mine, { token: token() });
    return mine.length;
  } catch {
    return 0;
  }
}

/** Every stored file the app still shows somewhere. */
async function referenced() {
  const [refunds, farmRows, boxRows, produceRows, userRows] = await Promise.all([
    db.select({ photos: refund_requests.photos, video: refund_requests.video_url }).from(refund_requests),
    db.select({ u: farms.cover_url }).from(farms).where(isNotNull(farms.cover_url)),
    db.select({ u: boxes.image_url }).from(boxes).where(isNotNull(boxes.image_url)),
    db.select({ u: produce.image_url }).from(produce).where(isNotNull(produce.image_url)),
    db.select({ u: users.avatar_url }).from(users).where(isNotNull(users.avatar_url)),
  ]);
  const used = new Set<string>();
  refunds.forEach((r) => { r.photos.forEach((p) => used.add(p)); if (r.video) used.add(r.video); });
  [...farmRows, ...boxRows, ...produceRows, ...userRows].forEach((r) => { if (isStored(r.u)) used.add(r.u); });
  return used;
}

async function allFiles() {
  const out: { url: string; pathname: string; size: number; uploadedAt: Date }[] = [];
  if (!token()) return out;
  let cursor: string | undefined;
  do {
    const page = await list({ token: token(), cursor, limit: 1000 });
    out.push(...page.blobs.map((b) => ({ url: b.url, pathname: b.pathname, size: b.size, uploadedAt: new Date(b.uploadedAt) })));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

const oldEvidence = () => db.select().from(refund_requests).where(and(ne(refund_requests.status, "pending"), lt(refund_requests.reviewed_at, new Date(Date.now() - EVIDENCE_KEEP_DAYS * 864e5)), or(isNotNull(refund_requests.video_url), sql`jsonb_array_length(${refund_requests.photos}) > 0`)));
const oldRequests = () => and(ne(change_requests.status, "pending"), lt(change_requests.reviewed_at, new Date(Date.now() - REQUEST_KEEP_DAYS * 864e5)));
const oldBroadcasts = () => lt(broadcasts.created_at, new Date(Date.now() - BROADCAST_KEEP_DAYS * 864e5));
const rowsOf = <T>(r: T[] | { rows?: T[] }) => (Array.isArray(r) ? r : r.rows ?? []);

/** Size of the database and of each table, from Postgres itself. */
export async function databaseUsage() {
  const [total] = rowsOf<{ bytes: string }>(await db.execute(sql`select pg_database_size(current_database())::text as bytes`));
  const tables = rowsOf<{ name: string; bytes: string; rows: string }>(await db.execute(sql`
    select c.relname as name, pg_total_relation_size(c.oid)::text as bytes, greatest(c.reltuples, 0)::bigint::text as rows
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' order by pg_total_relation_size(c.oid) desc`));
  // Postgres only estimates row counts after an ANALYZE; these tables are small enough to count.
  const counted = await Promise.all(tables.map(async (t) => {
    if (!/^[a-z_][a-z0-9_]*$/.test(t.name)) return Number(t.rows);
    const [c] = rowsOf<{ n: string }>(await db.execute(sql.raw(`select count(*)::text as n from "${t.name}"`)));
    return Number(c?.n ?? t.rows);
  }));
  return { bytes: Number(total?.bytes ?? 0), limit: DB_LIMIT_BYTES, tables: tables.map((t, i) => ({ name: t.name, bytes: Number(t.bytes), rows: counted[i] })) };
}

/** What a clean-up would remove right now. Nothing is changed. */
export async function cleanupPlan() {
  const configured = !!token();
  const [files, used, evidence, requests, sent] = await Promise.all([
    allFiles(), referenced(), oldEvidence(),
    db.select({ id: change_requests.id, kind: change_requests.kind, status: change_requests.status, payload: change_requests.payload }).from(change_requests).where(oldRequests()),
    db.select({ id: broadcasts.id, title: broadcasts.title }).from(broadcasts).where(oldBroadcasts()),
  ]);
  const orphans = files.filter((f) => !used.has(f.url) && Date.now() - f.uploadedAt.getTime() > ORPHAN_AFTER_MS);
  const sizeOf = new Map(files.map((f) => [f.url, f.size]));
  const evidenceUrls = evidence.flatMap((r) => [...r.photos, ...(r.video_url ? [r.video_url] : [])]);
  const kindLabel: Record<string, string> = { farm: "thông tin vườn", capacity: "rau củ đăng ký", produce: "rau củ mới" };
  const items: CleanupItem[] = [
    { key: "orphans", label: "Tệp không còn nơi nào dùng", what: "Ảnh, video đã tải lên nhưng không gửi, của yêu cầu đã rút, hoặc của tính năng đã bỏ (nhật ký vườn cũ). Không màn hình nào còn hiển thị chúng.", count: orphans.length, bytes: orphans.reduce((s, f) => s + f.size, 0), examples: orphans.slice(0, 5).map((f) => f.pathname), available: configured },
    { key: "evidence", label: `Ảnh, video bằng chứng của yêu cầu hoàn tiền đã xử lý quá ${EVIDENCE_KEEP_DAYS} ngày`, what: "Chỉ xoá tệp ảnh và video. Yêu cầu, lý do, kết quả xử lý và số tiền vẫn giữ nguyên để xem lại.", count: evidence.length, bytes: evidenceUrls.reduce((s, u) => s + (sizeOf.get(u) ?? 0), 0), examples: evidence.slice(0, 5).map((r) => `Đơn #${r.order_id.slice(0, 8).toUpperCase()}`), available: true },
    { key: "requests", label: `Yêu cầu đổi thông tin của nông hộ đã xử lý quá ${REQUEST_KEEP_DAYS} ngày`, what: "Thay đổi đã duyệt vẫn có hiệu lực. Chỉ xoá bản ghi yêu cầu cũ (kèm ảnh rau củ đính trong yêu cầu).", count: requests.length, bytes: null, examples: requests.slice(0, 5).map((r) => `${kindLabel[r.kind] ?? r.kind} · ${r.status === "approved" ? "đã duyệt" : "đã từ chối"}`), available: true },
    { key: "broadcasts", label: `Thông báo quản trị đã gửi quá ${BROADCAST_KEEP_DAYS} ngày`, what: "Thông báo đã tới người nhận từ lâu; bản lưu chỉ dùng để phát lại cho máy chưa đăng ký đẩy trong 24 giờ đầu.", count: sent.length, bytes: null, examples: sent.slice(0, 5).map((b) => b.title), available: true },
  ];
  return { files: { configured, count: files.length, bytes: files.reduce((s, f) => s + f.size, 0), limit: FILE_LIMIT_BYTES }, items };
}

export interface CleanupResult { key: CleanupKey; removed: number; bytes: number }

/** Removes the chosen kinds of leftover data. Order matters: evidence first, so its files count as unused. */
export async function runCleanup(keys: CleanupKey[]): Promise<CleanupResult[]> {
  const out: CleanupResult[] = [];
  if (keys.includes("evidence")) {
    const rows = await oldEvidence();
    for (const r of rows) await db.update(refund_requests).set({ photos: [], video_url: null }).where(eq(refund_requests.id, r.id));
    // The files go right away when the store is reachable; otherwise the next "orphans" pass takes them.
    const freed = await removeFiles(rows.flatMap((r) => [...r.photos, r.video_url]));
    out.push({ key: "evidence", removed: rows.length, bytes: freed });
  }
  if (keys.includes("requests")) out.push({ key: "requests", removed: (await db.delete(change_requests).where(oldRequests()).returning({ id: change_requests.id })).length, bytes: 0 });
  if (keys.includes("broadcasts")) out.push({ key: "broadcasts", removed: (await db.delete(broadcasts).where(oldBroadcasts()).returning({ id: broadcasts.id })).length, bytes: 0 });
  if (keys.includes("orphans") && token()) {
    const [files, used] = await Promise.all([allFiles(), referenced()]);
    const doomed = files.filter((f) => !used.has(f.url) && Date.now() - f.uploadedAt.getTime() > ORPHAN_AFTER_MS);
    for (let i = 0; i < doomed.length; i += 100) await del(doomed.slice(i, i + 100).map((f) => f.url), { token: token() });
    out.push({ key: "orphans", removed: doomed.length, bytes: doomed.reduce((s, f) => s + f.size, 0) });
  }
  return out;
}
