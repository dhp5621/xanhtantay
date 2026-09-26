import { NextResponse } from "next/server";
import { db } from "@/db";
import { farms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

/** The signed-in farmer's own farm (used by the diary composer). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const [farm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));
  if (!farm) return NextResponse.json({ error: "Bạn chưa có vườn" }, { status: 404 });
  return NextResponse.json(farm);
}
