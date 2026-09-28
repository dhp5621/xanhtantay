import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { fileRefund, refundFor, refundWindow, withdrawRefund } from "@/lib/refunds";

export const dynamic = "force-dynamic";

async function mine(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order || order.user_id !== user.id) return { error: NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 }) };
  return { user, order };
}

/** The order's return / refund request (or null) and whether one can still be filed. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const m = await mine((await params).id);
  if (m.error) return m.error;
  const w = refundWindow(m.order);
  return NextResponse.json({ request: await refundFor(m.order.id), can_request: w.open, until: w.until ?? null, reason: w.reason });
}

/**
 * POST { reason, description (≤200 words), photos: string[4], video_url, method: "refund" | "replace" }
 * Photos and the video are uploaded first through POST /upload with purpose=refund.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const m = await mine((await params).id);
  if (m.error) return m.error;
  const r = await fileRefund(m.order.id, m.user.id, (await req.json().catch(() => ({}))) as Record<string, unknown>);
  return r.ok ? NextResponse.json({ request: r.value, can_request: true }, { status: 201 }) : NextResponse.json({ error: r.error }, { status: r.status });
}

/** Withdraws a request that is still being verified. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const m = await mine((await params).id);
  if (m.error) return m.error;
  const r = await withdrawRefund(m.order.id, m.user.id);
  return r.ok ? NextResponse.json({ request: null, can_request: refundWindow(m.order).open }) : NextResponse.json({ error: r.error }, { status: r.status });
}
