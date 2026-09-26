export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/db";
import { farms, products } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Vườn rau" };

export default async function FarmsPage() {
  const rows = await db
    .select({ farm: farms, productCount: count(products.id) })
    .from(farms)
    .leftJoin(products, eq(products.farm_id, farms.id))
    .groupBy(farms.id);

  return (
    <div>
      <PageHeader icon="potted_plant" eyebrow="Từ vườn đến bàn ăn" title="Vườn rau" subtitle="Đặt hàng trực tiếp từ những người nông dân thực sự" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
        {rows.map(({ farm, productCount }) => (
          <Link key={farm.id} href={`/farms/${farm.slug}`} className="m3-card-elevated m3-card-action" style={{ height: "100%", display: "flex", flexDirection: "column", borderRadius: "var(--shape-xl)" }}>
            <div className="m3-media-wrap" style={{ height: 190, position: "relative" }}>
              {farm.cover_url ? <SmartImage src={farm.cover_url} alt={farm.name} className="m3-card-media" style={{ position: "absolute", inset: 0 }} /> : <div style={{ position: "absolute", inset: 0, background: "var(--md-primary-container)" }} />}
            </div>
            <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <h2 className="title-lg text-on-surface">{farm.name}</h2>
              <p className="body-sm text-primary" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                <Icon name="location_on" size={16} filled /> {farm.location}
              </p>
              <p className="body-sm text-on-surface-variant" style={{ flex: 1, lineHeight: 1.55 }}>{farm.description}</p>
              <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
                <span className="m3-chip sm m3-chip-surface"><Icon name="eco" size={16} /> {productCount} sản phẩm</span>
                <span className="m3-btn m3-btn-tonal m3-btn-sm"><span>Xem vườn</span><Icon name="arrow_forward" size={18} /></span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
