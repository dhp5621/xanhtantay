export const dynamic = "force-dynamic";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products, farms } from "@/db/schema";
import { PageHeader } from "@/components/ui/PageHeader";
import { Catalog } from "@/components/catalog/Catalog";

export const metadata = { title: "Rau củ" };

export default async function RauCuPage({ searchParams }: { searchParams: Promise<{ q?: string; loai?: string; mon?: string }> }) {
  const sp = await searchParams;
  const rows = await db.select({ p: products, farm: { id: farms.id, name: farms.name, slug: farms.slug, location: farms.location } }).from(products).innerJoin(farms, eq(products.farm_id, farms.id));
  const items = rows.map(({ p, farm }) => ({ id: p.id, name: p.name, unit: p.unit, price_per_unit: p.price_per_unit, category: p.category, in_stock: p.in_stock && p.stock_qty > 0, stock_qty: p.stock_qty, farm }));
  return (
    <div>
      <PageHeader icon="nutrition" eyebrow="Tất cả các vườn" title="Rau củ" subtitle="Tìm theo tên, lọc theo loại, so giá giữa các vườn" />
      <Catalog items={items} initialQuery={sp.q ?? ""} initialCategory={sp.loai ?? ""} initialProduct={sp.mon ?? ""} />
    </div>
  );
}
