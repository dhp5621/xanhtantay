import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { farms } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getFarms } from "@/lib/queries";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const [row] = await db.select({ id: farms.id }).from(farms).where(eq(farms.owner_id, user.id));
  if (!row) return NextResponse.json({ error: "Bạn chưa có vườn" }, { status: 404 });
  return NextResponse.json((await getFarms(row.id))[0]);
}
