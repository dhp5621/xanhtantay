import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, farms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farm_id");
  const rows = farmId
    ? await db.select().from(products).where(eq(products.farm_id, farmId))
    : await db.select().from(products);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { farm_id, name, unit, price_per_unit, category } = (body ?? {}) as Record<string, unknown>;
  if (!farm_id || !name || !unit || !category || !Number.isFinite(Number(price_per_unit))) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }

  const [farm] = await db.select().from(farms).where(eq(farms.id, String(farm_id)));
  if (!farm || farm.owner_id !== user.id) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const [product] = await db.insert(products).values({
    farm_id: farm.id, name: String(name), unit: String(unit), price_per_unit: Math.round(Number(price_per_unit)), category: String(category),
  }).returning();
  return NextResponse.json(product, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { id, ...rest } = (body ?? {}) as Record<string, unknown>;
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

  const [product] = await db.select().from(products).where(eq(products.id, String(id)));
  if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const [farm] = await db.select().from(farms).where(eq(farms.id, product.farm_id));
  if (!farm || farm.owner_id !== user.id) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  // Bug fix: previously any column (id, farm_id) could be overwritten. Whitelist editable fields.
  const updates: Partial<typeof products.$inferInsert> = {};
  if (typeof rest.name === "string") updates.name = rest.name.slice(0, 80);
  if (typeof rest.unit === "string") updates.unit = rest.unit.slice(0, 20);
  if (typeof rest.category === "string") updates.category = rest.category;
  if (typeof rest.in_stock === "boolean") updates.in_stock = rest.in_stock;
  if (rest.price_per_unit !== undefined && Number.isFinite(Number(rest.price_per_unit))) updates.price_per_unit = Math.round(Number(rest.price_per_unit));
  if (typeof rest.image_url === "string" || rest.image_url === null) updates.image_url = rest.image_url as string | null;
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 });

  const [updated] = await db.update(products).set(updates).where(eq(products.id, product.id)).returning();
  return NextResponse.json(updated);
}
