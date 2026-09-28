import { NextResponse } from "next/server";
import { answerCommand } from "@/lib/commands";
import { getSessionUser } from "@/lib/session";

/** "Có": the farmer will cut exactly this command. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const r = await answerCommand(id, user.id, "confirm");
  return r.ok ? NextResponse.json({ ...r.command, notice: r.notice }) : NextResponse.json({ error: r.error }, { status: r.status });
}
