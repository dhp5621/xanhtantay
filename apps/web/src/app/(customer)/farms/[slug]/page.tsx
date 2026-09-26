export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { farms, products, farm_diary } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { FollowFarmButton } from "@/components/farm/FollowFarmButton";
import { SubscribeButton } from "@/components/farm/SubscribeButton";
import { getSessionUser } from "@/lib/session";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { ProductThumb } from "@/components/catalog/ProductThumb";
import { Icon } from "@/components/ui/Icon";
import { CATEGORY_LABELS, CATEGORY_ICONS, formatVND, formatDateTime, timeAgo } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [farm] = await db.select({ name: farms.name }).from(farms).where(eq(farms.slug, slug));
  return { title: farm?.name ?? "Vườn rau" };
}

export default async function FarmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [farm] = await db.select().from(farms).where(eq(farms.slug, slug));
  if (!farm) notFound();

  const [farmProducts, diary, viewer] = await Promise.all([
    db.select().from(products).where(eq(products.farm_id, farm.id)),
    db.select().from(farm_diary).where(eq(farm_diary.farm_id, farm.id)).orderBy(desc(farm_diary.created_at)).limit(10),
    getSessionUser(),
  ]);
  // A farmer only reaches this page for their own farm (middleware); show it as a preview, no buying.
  const preview = viewer?.role === "farmer";

  const grouped = farmProducts.reduce<Record<string, typeof farmProducts>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-8">
      {preview && (
        <div className="m3-card-filled anim-in" style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderRadius: "var(--shape-lg)", background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)" }}>
          <Icon name="visibility" filled />
          <span className="body-md" style={{ flex: 1 }}>Bạn đang xem vườn của mình như khách hàng nhìn thấy.</span>
          <a href="/farmer/san-pham" className="m3-btn m3-btn-sm" style={{ background: "var(--md-on-tertiary-container)", color: "var(--md-tertiary-container)" }}><Icon name="inventory_2" size={18} /><span>Sửa tồn kho</span></a>
        </div>
      )}
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
        {!preview && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <FollowFarmButton farmId={farm.id} farmName={farm.name} />
            <SubscribeButton farmId={farm.id} />
          </div>
        )}
      </div>

      {/* Products */}
      <section id="san-pham">
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
                <div key={product.id} className="m3-card lift" style={{ padding: "12px 14px 12px 12px", opacity: product.in_stock && product.stock_qty > 0 ? 1 : 0.6, display: "flex", alignItems: "center", gap: 12, borderRadius: "var(--shape-lg-inc)" }}>
                  <ProductThumb image_url={product.image_url} category={product.category} name={product.name} size={76} radius="var(--shape-lg)" zoom caption={product.name} tag={farm.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="title-sm text-on-surface" style={{ marginBottom: 2 }}>{product.name}</p>
                    <p className="label-lg text-primary tabular">{formatVND(product.price_per_unit)} <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>/ {product.unit}</span></p>
                    {!product.in_stock || product.stock_qty <= 0 ? (
                      <span className="m3-chip sm m3-chip-error round" style={{ marginTop: 6 }}><Icon name="block" size={14} /> Hết hàng</span>
                    ) : (
                      <span className={`m3-chip sm round ${product.stock_qty <= 5 ? "m3-chip-error" : "m3-chip-surface"}`} style={{ marginTop: 6 }}>
                        <Icon name={product.stock_qty <= 5 ? "priority_high" : "inventory_2"} size={14} /> {product.stock_qty <= 5 ? `Chỉ còn ${product.stock_qty} ${product.unit}` : `Còn ${product.stock_qty} ${product.unit}`}
                      </span>
                    )}
                  </div>
                  {!preview && product.in_stock && product.stock_qty > 0 && (
                    <AddToCartButton compact max={product.stock_qty} product={{ id: product.id, name: product.name, unit: product.unit, price_per_unit: product.price_per_unit, farm_id: farm.id, farm_name: farm.name, farm_slug: farm.slug, farm_location: farm.location }} />
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
                {entry.media_urls.length ? (
                  <span style={{ position: "relative", flexShrink: 0 }}>
                    <MediaGallery urls={entry.media_urls.slice(0, 1)} size={96} caption={formatDateTime(entry.created_at)} tag={farm.name} />
                    {entry.media_urls.length > 1 && (
                      <span className="m3-chip sm round" style={{ position: "absolute", right: 4, bottom: 4, height: 20, fontSize: 10, padding: "0 6px", background: "rgba(0,0,0,.6)", color: "#fff", boxShadow: "none", pointerEvents: "none" }}>
                        <Icon name="photo_library" size={12} filled /> {entry.media_urls.length}
                      </span>
                    )}
                  </span>
                ) : <span className="m3-list-leading"><Icon name="eco" /></span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/nhat-ky/${entry.id}`} className="body-md text-on-surface" style={{ fontWeight: 400, lineHeight: 1.6, textDecoration: "none", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{entry.content}</Link>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                    <p className="body-sm text-on-surface-variant" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icon name="schedule" size={14} /> <strong style={{ fontWeight: 600 }}>{timeAgo(entry.created_at)}</strong> · {formatDateTime(entry.created_at)}
                    </p>
                    <Link href={`/nhat-ky/${entry.id}`} className="m3-btn m3-btn-text m3-btn-sm"><span>Xem bài đầy đủ</span><Icon name="arrow_forward" size={16} /></Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
