import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { farms } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const allFarms = await db.select().from(farms);
  return NextResponse.json(allFarms);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const user = session.user as { id: string; role?: string };
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const body = await req.json();
  const { name, location, description, slug } = body;

  if (!name || !location || !slug) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }

  const [farm] = await db.insert(farms).values({
    owner_id: user.id,
    name,
    location,
    description,
    slug,
  }).returning();

  return NextResponse.json(farm, { status: 201 });
}
