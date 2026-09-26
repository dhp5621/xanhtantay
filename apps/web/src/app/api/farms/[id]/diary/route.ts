import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { farm_diary, farms } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const entries = await db
    .select()
    .from(farm_diary)
    .where(eq(farm_diary.farm_id, params.id))
    .orderBy(desc(farm_diary.created_at))
    .limit(20);
  return NextResponse.json(entries);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const user = session.user as { id: string; role?: string };
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const [farm] = await db.select().from(farms).where(eq(farms.id, params.id));
  if (!farm || farm.owner_id !== user.id) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const body = await req.json();
  const { content, media_urls = [] } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: "Nội dung không được trống" }, { status: 400 });
  }

  const [entry] = await db.insert(farm_diary).values({
    farm_id: params.id,
    content,
    media_urls,
  }).returning();

  return NextResponse.json(entry, { status: 201 });
}
