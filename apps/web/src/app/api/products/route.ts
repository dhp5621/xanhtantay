import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { products, farms } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farm_id");
  const rows = farmId
    ? await db.select().from(products).where(eq(products.farm_id, farmId))
    : await db.select().from(products);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const user = session.user as { id: string; role?: string };
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const body = await req.json();
  const { farm_id, name, unit, price_per_unit, category } = body;

  const [farm] = await db.select().from(farms).where(eq(farms.id, farm_id));
  if (!farm || farm.owner_id !== user.id) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const [product] = await db.insert(products).values({ farm_id, name, unit, price_per_unit, category }).returning();
  return NextResponse.json(product, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const user = session.user as { id: string; role?: string };
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;

  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const [farm] = await db.select().from(farms).where(eq(farms.id, product.farm_id));
  if (!farm || farm.owner_id !== user.id) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
  return NextResponse.json(updated);
}
