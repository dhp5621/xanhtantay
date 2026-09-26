export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, order_items, products, farms, users, farm_diary } from "@/db/schema";
import { Icon } from "@/components/ui/Icon";
import { formatDateTime, formatVND, STATUS_ICONS, STATUS_SHORT } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@xanhtantay/types";
import { stripEmoji } from "@/lib/format";
import { MediaGallery } from "@/components/ui/MediaGallery";

export const metadata = { title: "Tra cứu gói rau" };
const STEPS = ["harvesting", "loaded", "delivered"] as const;

/** Public page behind the QR code on each package. Shows origin, not the buyer's identity. */
export default async function TraCuuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select({ o: orders, farm: farms, farmer: { name: users.name } }).from(orders)
    .leftJoin(farms, eq(orders.farm_id, farms.id)).leftJoin(users, eq(farms.owner_id, users.id)).where(eq(orders.id, id));
  if (!row || !row.farm) notFound();
  const { o, farm, farmer } = row;
  const [items, diary] = await Promise.all([
    db.select({ oi: order_items, p: products }).from(order_items).leftJoin(products, eq(order_items.product_id, products.id)).where(eq(order_items.order_id, id)),
    db.select().from(farm_diary).where(eq(farm_diary.farm_id, farm.id)).orderBy(desc(farm_diary.created_at)).limit(3),
  ]);
  const idx = STEPS.indexOf(o.status);
  const code = o.id.slice(0, 8).toUpperCase();

  return (
    <main className="m3-page max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="m3-image-hero anim-in-scale" style={{ height: 220, backgroundImage: farm.cover_url ? `url(${farm.cover_url})` : undefined, backgroundColor: "var(--md-primary-container)" }}>
        <div style={{ position: "absolute", bottom: 22, left: 24, right: 24, zIndex: 1, color: "#fff" }}>
          <p className="label-md" style={{ opacity: 0.85, display: "inline-flex", gap: 4, alignItems: "center" }}><Icon name="qr_code_2" size={16} /> Gói rau #{code}</p>
          <h1 className="headline-md" style={{ color: "#fff" }}>{farm.name}</h1>
          <p className="body-sm" style={{ opacity: 0.85, display: "inline-flex", gap: 4, alignItems: "center" }}><Icon name="location_on" size={14} filled /> {farm.location} · {farmer?.name}</p>
        </div>
      </div>

      <section className="m3-card-filled anim-in" style={{ padding: 20, borderRadius: "var(--shape-xl)" }}>
        <p className="label-md text-on-surface-variant" style={{ textTransform: "uppercase", marginBottom: 10 }}>Hành trình</p>
        <div className="flex items-center" style={{ padding: "0 4px" }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "contents" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 72 }}>
                <span className={`m3-step-dot ${i < idx ? "done" : ""} ${i === idx ? "current" : ""}`}>{i < idx ? <Icon name="check" size={20} bold /> : <Icon name={STATUS_ICONS[s]} size={20} filled={i === idx} />}</span>
                <span className="label-sm" style={{ color: i <= idx ? "var(--md-primary)" : "var(--md-on-surface-variant)", letterSpacing: 0 }}>{STATUS_SHORT[s]}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`m3-step-line ${i < idx ? "done" : ""}`} style={{ marginBottom: 22 }} />}
            </div>
          ))}
        </div>
        <p className="body-md text-on-surface" style={{ marginTop: 12, textAlign: "center" }}>{stripEmoji(ORDER_STATUS_LABELS[o.status])}</p>
        <p className="body-sm text-on-surface-variant" style={{ textAlign: "center" }}>Đặt lúc {formatDateTime(o.created_at)} · {o.delivery_mode === "pooled" ? "Chuyến ghép" : "Giao riêng"}</p>
      </section>

      <section className="anim-in delay-1">
        <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="inventory_2" filled /> Trong gói này</h2></div>
        <div className="m3-list-group">
          {items.map(({ oi, p }) => (
            <div key={oi.id} className="m3-list-item" style={{ cursor: "default" }}>
              <span className="m3-list-leading"><Icon name="eco" /></span>
              <span style={{ flex: 1 }}>{p?.name ?? "Sản phẩm"}</span>
              <span className="label-lg tabular">{Number(oi.quantity)} {p?.unit}</span>
              <span className="body-sm text-on-surface-variant tabular" style={{ minWidth: 80, textAlign: "right" }}>{formatVND(oi.unit_price * Number(oi.quantity))}</span>
            </div>
          ))}
        </div>
      </section>

      {diary.length > 0 && (
        <section className="anim-in delay-2">
          <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="auto_stories" filled /> Vườn những ngày qua</h2></div>
          <div className="m3-list-group">
            {diary.map((d) => (
              <div key={d.id} className="m3-list-item" style={{ cursor: "default", alignItems: "flex-start" }}>
                {d.media_urls.length ? <MediaGallery urls={d.media_urls} size={72} /> : <span className="m3-list-leading"><Icon name="eco" /></span>}
                <div><p className="body-md" style={{ fontWeight: 400 }}>{d.content}</p><p className="body-sm text-on-surface-variant" style={{ marginTop: 4 }}>{formatDateTime(d.created_at)}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2 justify-center anim-in delay-3">
        <Link href={`/farms/${farm.slug}`} className="m3-btn m3-btn-filled"><Icon name="potted_plant" filled /><span>Đặt thêm từ vườn này</span></Link>
        <Link href="/" className="m3-btn m3-btn-text"><span>Về Xanh Tận Tay</span></Link>
      </div>
    </main>
  );
}
