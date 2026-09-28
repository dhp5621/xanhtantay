import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { reviewRefund } from "@/lib/refunds";

/** POST { action: "approve" | "reject", resolution?: "refund" | "replace", amount?, note? } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; resolution?: string; amount?: number; note?: string };
  if (body.action !== "approve" && body.action !== "reject") return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  const r = await reviewRefund((await params).id, { action: body.action, resolution: body.resolution, amount: body.amount, note: body.note });
  return r.ok ? NextResponse.json(r.value) : NextResponse.json({ error: r.error }, { status: r.status });
}
