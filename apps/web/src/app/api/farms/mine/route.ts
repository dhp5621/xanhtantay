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

/**
 * PATCH { name?, location?, province?, description? }: the farmer edits how their farm is presented.
 * The page address (slug) never changes, so QR codes and shared links keep working.
 */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const [row] = await db.select({ id: farms.id }).from(farms).where(eq(farms.owner_id, user.id));
  if (!row) return NextResponse.json({ error: "Bạn chưa có vườn" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const updates: Partial<typeof farms.$inferInsert> = {};
  const field = (key: "name" | "location" | "province", label: string, max: number) => {
    if (typeof body[key] !== "string") return null;
    const v = (body[key] as string).replace(/\s+/g, " ").trim().slice(0, max);
    if (v.length < 2) return `${label} cần ít nhất 2 ký tự`;
    updates[key] = v;
    return null;
  };
  const problem = field("name", "Tên vườn", 80) ?? field("location", "Địa chỉ vườn", 120) ?? field("province", "Tỉnh", 40);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (typeof body.description === "string") updates.description = body.description.trim().slice(0, 1200) || null;
  if (!Object.keys(updates).length) return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 });
  await db.update(farms).set(updates).where(eq(farms.id, row.id));
  return NextResponse.json((await getFarms(row.id))[0]);
}
