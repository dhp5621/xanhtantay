import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { farms, harvest_commands } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

/** The single button: "Đã hiểu & Xác nhận". */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const [row] = await db.select({ c: harvest_commands, owner: farms.owner_id }).from(harvest_commands).innerJoin(farms, eq(harvest_commands.farm_id, farms.id)).where(eq(harvest_commands.id, id));
  if (!row || row.owner !== user.id) return NextResponse.json({ error: "Không tìm thấy lệnh thu hoạch" }, { status: 404 });
  if (row.c.status === "confirmed") return NextResponse.json({ ...row.c, already: true });
  const [updated] = await db.update(harvest_commands).set({ status: "confirmed", confirmed_at: new Date() }).where(and(eq(harvest_commands.id, id), eq(harvest_commands.status, "sent"))).returning();
  return NextResponse.json(updated ?? row.c);
}
