import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, order_items, products, farms } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Public trace lookup for a single order/package — same data the /tra-cuu/[id] web page renders,
 * exposed as JSON so a QR scan (or manual code entry) works from the mobile app too. No auth
 * required: this is the same package-tracking info printed on the farmer's QR sticker, and never
 * exposes the buyer's identity.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({ o: orders, farm: farms })
    .from(orders)
    .leftJoin(farms, eq(orders.farm_id, farms.id))
    .where(eq(orders.id, id));
  if (!row || !row.farm) return NextResponse.json({ error: "Không tìm thấy gói rau với mã này" }, { status: 404 });

  const items = await db
    .select({ id: order_items.id, quantity: order_items.quantity, product_name: products.name, product_unit: products.unit })
    .from(order_items)
    .leftJoin(products, eq(order_items.product_id, products.id))
    .where(eq(order_items.order_id, id));

  return NextResponse.json({
    id: row.o.id,
    status: row.o.status,
    created_at: row.o.created_at,
    farm: { name: row.farm.name, location: row.farm.location, cover_url: row.farm.cover_url },
    items: items.map((it) => ({ ...it, quantity: Number(it.quantity) })),
  });
}
