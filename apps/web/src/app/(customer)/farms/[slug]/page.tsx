export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { farms, products, farm_diary } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { AddToCartButton } from "@/components/order/AddToCartButton";

export default async function FarmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [farm] = await db.select().from(farms).where(eq(farms.slug, slug));
  if (!farm) notFound();

  const [farmProducts, diary] = await Promise.all([
    db.select().from(products).where(eq(products.farm_id, farm.id)),
    db.select().from(farm_diary).where(eq(farm_diary.farm_id, farm.id)).orderBy(desc(farm_diary.created_at)).limit(10),
  ]);

  const categories: Record<string, string> = {
    rau_la: "Rau lá",
    cu_qua: "Củ quả",
    rau_thom: "Rau thơm",
    rau_mam: "Rau mầm",
  };

  const grouped = farmProducts.reduce<Record<string, typeof farmProducts>>(
    (acc, p) => {
      const cat = p.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    },
    {}
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div
        style={{
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          position: "relative",
          height: 280,
          background: farm.cover_url
            ? `url(${farm.cover_url}) center/cover`
            : "var(--md-primary-container)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 28,
            right: 28,
          }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            {farm.name}
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.85)" }}>
            📍 {farm.location}
          </p>
        </div>
      </div>

      {/* Description */}
      {farm.description && (
        <p
          style={{
            fontSize: 15,
            color: "var(--md-on-surface-variant)",
            lineHeight: 1.7,
            maxWidth: 640,
          }}
        >
          {farm.description}
        </p>
      )}

      {/* Livestream placeholder */}
      <div
        style={{
          background: "var(--md-surface-container)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 32 }}>📺</span>
        <div>
          <p style={{ fontWeight: 700, color: "var(--md-on-surface)", marginBottom: 2 }}>
            Livestream tại vườn
          </p>
          <p style={{ fontSize: 13, color: "var(--md-on-surface-variant)" }}>
            Chưa có phiên live nào đang diễn ra. Theo dõi để nhận thông báo khi bắt đầu.
          </p>
        </div>
        <button className="m3-tonal-button" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
          🔔 Theo dõi
        </button>
      </div>

      {/* Products */}
      <section>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--md-on-surface)", marginBottom: 20 }}>
          Sản phẩm từ vườn
        </h2>
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-6">
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".05em",
                color: "var(--md-on-surface-variant)",
                marginBottom: 12,
              }}
            >
              {categories[cat] ?? cat}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((product) => (
                <div
                  key={product.id}
                  className="m3-card"
                  style={{
                    padding: "14px 16px",
                    opacity: product.in_stock ? 1 : 0.55,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--md-on-surface)", marginBottom: 2 }}>
                      {product.name}
                    </p>
                    <p style={{ fontSize: 13, color: "var(--md-primary)", fontWeight: 600 }}>
                      {product.price_per_unit.toLocaleString("vi-VN")}₫ / {product.unit}
                    </p>
                    {!product.in_stock && (
                      <span className="m3-chip" style={{ marginTop: 4, fontSize: 11 }}>
                        Hết hàng
                      </span>
                    )}
                  </div>
                  {product.in_stock && (
                    <AddToCartButton product={product} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Farm diary */}
      {diary.length > 0 && (
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--md-on-surface)", marginBottom: 16 }}>
            Nhật ký vườn 📖
          </h2>
          <div className="flex flex-col gap-4">
            {diary.map((entry) => (
              <div
                key={entry.id}
                className="m3-card"
                style={{ padding: "16px", display: "flex", gap: 14 }}
              >
                {entry.media_urls[0] && (
                  <div
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: "var(--radius-md)",
                      background: `url(${entry.media_urls[0]}) center/cover`,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div>
                  <p style={{ fontSize: 14, color: "var(--md-on-surface)", lineHeight: 1.6 }}>
                    {entry.content}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--md-on-surface-variant)", marginTop: 8 }}>
                    {new Date(entry.created_at).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
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
