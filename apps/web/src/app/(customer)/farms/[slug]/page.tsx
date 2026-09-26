export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { farms, products, farm_diary } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { FollowFarmButton } from "@/components/farm/FollowFarmButton";
import { SubscribeButton } from "@/components/farm/SubscribeButton";
import { Icon } from "@/components/ui/Icon";
import { CATEGORY_LABELS, CATEGORY_ICONS, formatVND, formatDate } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [farm] = await db.select({ name: farms.name }).from(farms).where(eq(farms.slug, slug));
  return { title: farm?.name ?? "Vườn rau" };
}

export default async function FarmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [farm] = await db.select().from(farms).where(eq(farms.slug, slug));
  if (!farm) notFound();

  const [farmProducts, diary] = await Promise.all([
    db.select().from(products).where(eq(products.farm_id, farm.id)),
    db.select().from(farm_diary).where(eq(farm_diary.farm_id, farm.id)).orderBy(desc(farm_diary.created_at)).limit(10),
  ]);

  const grouped = farmProducts.reduce<Record<string, typeof farmProducts>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="m3-image-hero anim-in-scale" style={{ height: 300, backgroundImage: farm.cover_url ? `url(${farm.cover_url})` : undefined, backgroundColor: "var(--md-primary-container)" }}>
        <div style={{ position: "absolute", bottom: 28, left: 28, right: 28, zIndex: 1, color: "#fff" }}>
          <p className="label-md anim-in" style={{ opacity: 0.85, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
            <Icon name="location_on" size={16} filled /> {farm.location}
          </p>
          <h1 className="display-sm anim-in delay-1" style={{ color: "#fff" }}>{farm.name}</h1>
        </div>
      </div>

      {farm.description && (
        <p className="body-lg text-on-surface-variant anim-in delay-1" style={{ maxWidth: 680, lineHeight: 1.7 }}>{farm.description}</p>
      )}

      {/* Live + actions */}
      <div className="m3-card-filled anim-in delay-2" style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", borderRadius: "var(--shape-xl)" }}>
        <span className="m3-list-leading" style={{ background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)", width: 52, height: 52 }}><Icon name="videocam" size={28} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p className="title-md text-on-surface">Livestream tại vườn</p>
          <p className="body-sm text-on-surface-variant">Chưa có phiên live nào. Theo dõi để nhận thông báo khi bắt đầu.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FollowFarmButton farmId={farm.id} farmName={farm.name} />
          <SubscribeButton farmId={farm.id} />
        </div>
      </div>

      {/* Products */}
      <section>
        <div className="m3-section-head">
          <h2 className="headline-sm text-on-surface"><Icon name="shopping_basket" filled /> Sản phẩm từ vườn</h2>
          <span className="body-sm text-on-surface-variant">{farmProducts.filter((p) => p.in_stock).length} món còn hàng</span>
        </div>
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-7">
            <h3 className="label-md text-on-surface-variant" style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6, textTransform: "uppercase" }}>
              <Icon name={CATEGORY_ICONS[cat] ?? "eco"} size={18} /> {CATEGORY_LABELS[cat] ?? cat}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
              {items.map((product) => (
                <div key={product.id} className="m3-card lift" style={{ padding: "14px 14px 14px 18px", opacity: product.in_stock ? 1 : 0.6, display: "flex", alignItems: "center", gap: 12, borderRadius: "var(--shape-lg-inc)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="title-sm text-on-surface" style={{ marginBottom: 2 }}>{product.name}</p>
                    <p className="label-lg text-primary tabular">{formatVND(product.price_per_unit)} <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>/ {product.unit}</span></p>
                    {!product.in_stock && <span className="m3-chip sm m3-chip-error round" style={{ marginTop: 6 }}><Icon name="block" size={14} /> Hết hàng</span>}
                  </div>
                  {product.in_stock && (
                    <AddToCartButton compact product={{ id: product.id, name: product.name, unit: product.unit, price_per_unit: product.price_per_unit, farm_id: farm.id, farm_name: farm.name, farm_slug: farm.slug }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Diary */}
      {diary.length > 0 && (
        <section>
          <div className="m3-section-head">
            <h2 className="headline-sm text-on-surface"><Icon name="auto_stories" filled /> Nhật ký vườn</h2>
          </div>
          <div className="m3-list-group stagger">
            {diary.map((entry) => (
              <div key={entry.id} className="m3-list-item" style={{ alignItems: "flex-start", padding: 16, cursor: "default" }}>
                {entry.media_urls[0] ? (
                  <div className="m3-media-wrap" style={{ width: 96, height: 96, borderRadius: "var(--shape-md)", flexShrink: 0 }}>
                    <div className="m3-card-media" style={{ width: "100%", height: "100%", backgroundImage: `url(${entry.media_urls[0]})` }} />
                  </div>
                ) : <span className="m3-list-leading"><Icon name="eco" /></span>}
                <div>
                  <p className="body-md text-on-surface" style={{ fontWeight: 400, lineHeight: 1.6 }}>{entry.content}</p>
                  <p className="body-sm text-on-surface-variant" style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name="schedule" size={14} /> {formatDate(entry.created_at, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
