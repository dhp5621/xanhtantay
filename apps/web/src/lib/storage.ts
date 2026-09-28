import { del, list } from "@vercel/blob";
import { and, eq, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { boxes, broadcasts, change_requests, farms, produce, refund_requests, users } from "@/db/schema";

/**
 * Keeps the 1 GB file store from filling up: files are removed as soon as nothing shows them any
 * more, and a daily sweep catches whatever was left behind (uploads that were never sent, files
 * of features that no longer exist).
 */
const token = () => process.env.BLOB_READ_WRITE_TOKEN;
const isStored = (u: unknown): u is string => typeof u === "string" && /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(u);

/** A file uploaded moments ago may belong to a form that is about to be sent. */
const ORPHAN_AFTER_MS = 24 * 3600 * 1000;
/** Evidence of a decided return / refund request is kept this long for disputes, then removed. */
export const EVIDENCE_KEEP_DAYS = 60;
/** Decided change requests (with their photos) and old broadcasts are history after this long. */
const HISTORY_KEEP_DAYS = 30;

/** Best-effort: a failed delete is picked up by the next sweep. */
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

export interface SweepResult { configured: boolean; files: number; bytes: number; removed: number; freed: number; expiredEvidence: number; historyRows: number }

/** Totals of the store, without removing anything. */
export async function storageUsage() {
  if (!token()) return { configured: false, files: 0, bytes: 0 };
  let files = 0, bytes = 0, cursor: string | undefined;
  do {
    const page = await list({ token: token(), cursor, limit: 1000 });
    files += page.blobs.length;
    bytes += page.blobs.reduce((s, b) => s + b.size, 0);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return { configured: true, files, bytes };
}

export async function sweepStorage(): Promise<SweepResult> {
  const out: SweepResult = { configured: !!token(), files: 0, bytes: 0, removed: 0, freed: 0, expiredEvidence: 0, historyRows: 0 };

  // 1. Evidence of requests decided long ago: the verdict stays, the files go.
  const old = await db.select().from(refund_requests).where(and(ne(refund_requests.status, "pending"), lt(refund_requests.reviewed_at, new Date(Date.now() - EVIDENCE_KEEP_DAYS * 864e5)), or(isNotNull(refund_requests.video_url), sql`jsonb_array_length(${refund_requests.photos}) > 0`)));
  for (const r of old) {
    await db.update(refund_requests).set({ photos: [], video_url: null }).where(eq(refund_requests.id, r.id));
    out.expiredEvidence++;
  }

  // 2. Rows that only hold history (decided change requests carry photos inline; broadcasts are read once).
  const history = new Date(Date.now() - HISTORY_KEEP_DAYS * 864e5);
  const gone = await db.delete(change_requests).where(and(ne(change_requests.status, "pending"), lt(change_requests.reviewed_at, history))).returning({ id: change_requests.id });
  const sent = await db.delete(broadcasts).where(lt(broadcasts.created_at, new Date(Date.now() - 7 * 864e5))).returning({ id: broadcasts.id });
  out.historyRows = gone.length + sent.length;

  // 3. Files nothing points at any more.
  if (!token()) return out;
  const used = await referenced();
  const doomed: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ token: token(), cursor, limit: 1000 });
    for (const b of page.blobs) {
      out.files++;
      out.bytes += b.size;
      if (!used.has(b.url) && Date.now() - new Date(b.uploadedAt).getTime() > ORPHAN_AFTER_MS) { doomed.push(b.url); out.freed += b.size; }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  for (let i = 0; i < doomed.length; i += 100) {
    await del(doomed.slice(i, i + 100), { token: token() });
    out.removed += Math.min(100, doomed.length - i);
  }
  out.files -= out.removed;
  out.bytes -= out.freed;
  return out;
}
