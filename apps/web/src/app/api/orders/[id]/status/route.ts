import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { orders, farms } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const user = session.user as { id: string; role?: string };
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const body = await req.json();
  const { status } = body;

  const validStatuses = ["harvesting", "loaded", "delivered"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  // Verify the order belongs to this farmer's farm
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });

  const [farm] = await db.select().from(farms).where(eq(farms.id, order.farm_id));
  if (!farm || farm.owner_id !== user.id) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const [updated] = await db
    .update(orders)
    .set({ status })
    .where(eq(orders.id, id))
    .returning();

  return NextResponse.json(updated);
}
