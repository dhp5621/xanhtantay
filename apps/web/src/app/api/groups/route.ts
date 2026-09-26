import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { group_orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const groups = await db.select().from(group_orders).where(eq(group_orders.status, "open"));
  return NextResponse.json(groups);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json();
  const { farm_id, title, min_members, deadline, shipping_address } = body;

  if (!farm_id || !title || !min_members || !deadline || !shipping_address) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }

  const [group] = await db.insert(group_orders).values({
    farm_id,
    title,
    min_members,
    deadline: new Date(deadline),
    shipping_address,
    status: "open",
    current_members: 0,
  }).returning();

  return NextResponse.json(group, { status: 201 });
}
