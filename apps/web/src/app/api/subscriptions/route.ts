import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, products, farms, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  // Farmers see the customers subscribed to their own farm (what /farmer/dang-ky renders on the web).
  if (user.role === "farmer") {
    const [myFarm] = await db.select({ id: farms.id }).from(farms).where(eq(farms.owner_id, user.id));
    if (!myFarm) return NextResponse.json([]);
    const rows = await db
      .select({ sub: subscriptions, customer_name: users.name, customer_phone: users.phone })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.user_id, users.id))
      .where(eq(subscriptions.farm_id, myFarm.id));
    return NextResponse.json(rows.map(({ sub, customer_name, customer_phone }) => ({ ...sub, customer_name, customer_phone })));
  }

  const subs = await db
    .select({ sub: subscriptions, farm: { id: farms.id, name: farms.name, slug: farms.slug } })
    .from(subscriptions)
    .leftJoin(farms, eq(subscriptions.farm_id, farms.id))
    .where(eq(subscriptions.user_id, user.id));

  // Resolve product names/prices so clients never have to print raw product ids.
  const productIds = Array.from(new Set(subs.flatMap(({ sub }) => sub.items.map((i) => i.product_id))));
  const prods = productIds.length ? await db.select().from(products).where(inArray(products.id, productIds)) : [];
  const byId = new Map(prods.map((p) => [p.id, p]));

  return NextResponse.json(
    subs.map(({ sub, farm }) => ({
      ...sub,
      farm,
      items: sub.items.map((i) => {
        const p = byId.get(i.product_id);
        return { ...i, name: p?.name ?? null, unit: p?.unit ?? null, price_per_unit: p?.price_per_unit ?? null };
      }),
    }))
  );
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { farm_id, frequency, items } = (body ?? {}) as { farm_id?: string; frequency?: string; items?: { product_id: string; quantity: number }[] };

  if (!farm_id || !frequency || !Array.isArray(items) || !items.length) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }
  if (frequency !== "weekly" && frequency !== "monthly") {
    return NextResponse.json({ error: "Tần suất không hợp lệ" }, { status: 400 });
  }

  const rows = await db.select().from(products).where(inArray(products.id, items.map((i) => i.product_id)));
  if (rows.length !== new Set(items.map((i) => i.product_id)).size || rows.some((p) => p.farm_id !== farm_id)) {
    return NextResponse.json({ error: "Sản phẩm không thuộc vườn này" }, { status: 400 });
  }
  const clean = items.map((i) => ({ product_id: i.product_id, quantity: Math.max(1, Math.min(100, Math.round(Number(i.quantity)) || 1)) }));

  const nextDelivery = new Date();
  nextDelivery.setDate(nextDelivery.getDate() + (frequency === "weekly" ? 7 : 30));

  const [sub] = await db.insert(subscriptions).values({
    user_id: user.id, farm_id, frequency, next_delivery: nextDelivery, items: clean, active: true,
  }).returning();

  return NextResponse.json(sub, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { id, items, active } = (body ?? {}) as { id?: string; items?: unknown; active?: unknown };
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
  if (!sub || sub.user_id !== user.id) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const updateData: Partial<typeof subscriptions.$inferInsert> = {};
  if (Array.isArray(items)) updateData.items = items as { product_id: string; quantity: number }[];
  if (typeof active === "boolean") updateData.active = active;
  if (Object.keys(updateData).length === 0) return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 });

  const [updated] = await db.update(subscriptions).set(updateData).where(eq(subscriptions.id, id)).returning();
  return NextResponse.json(updated);
}
