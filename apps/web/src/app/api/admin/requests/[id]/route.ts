import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { reviewRequest } from "@/lib/requests";

/** POST { action: "approve" | "reject", note? } — the operator decides on a farmer's change request. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; note?: string };
  if (body.action !== "approve" && body.action !== "reject") return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  const r = await reviewRequest(id, body.action, body.note);
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: r.status });
}
