export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { BoxContents } from "@/components/box/BoxContents";
import { BoxMenu } from "@/components/box/BoxMenu";
import { getOrderTrace, getFarms } from "@/lib/queries";
import { addressFarmer, formatKg, formatYMD, SIZE_LABELS } from "@/lib/commerce";
import { formatClock } from "@/lib/format";

export const metadata = { title: "Truy xuất hộp rau" };

/** Public page behind the QR code on each box: when the vegetables were cut and by whom. No buyer identity. */
export default async function TraCuuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await getOrderTrace(id);
  if (!o) notFound();
  const allFarms = await getFarms();
  const covers = new Map(allFarms.map((f) => [f.slug, f]));
  const code = o.id.slice(0, 8).toUpperCase();
  const farmer = o.farms[0] ? addressFarmer(o.farms[0].farmer).call.replace(/^./, (c) => c.toLowerCase()) : null;

  return (
    <main className="m3-page max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="m3-image-hero anim-in-scale" style={{ height: 220, background: "var(--md-primary-container)" }}>
        {o.box.image_url && <SmartImage src={o.box.image_url} alt={o.box.name} style={{ position: "absolute", inset: 0 }} priority />}
        <div style={{ position: "absolute", bottom: 22, left: 24, right: 24, zIndex: 1, color: "#fff" }}>
          <p className="label-md" style={{ opacity: 0.85, display: "inline-flex", gap: 4, alignItems: "center" }}><Icon name="qr_code_2" size={16} /> Hộp rau #{code}</p>
          <h1 className="headline-md" style={{ color: "#fff" }}>{o.box.name}</h1>
          <p className="body-sm" style={{ opacity: 0.85 }}>{SIZE_LABELS[o.box.size]} · {formatKg(o.box.weight_kg * o.quantity)} · giao {formatYMD(o.delivery_date)}{o.cluster ? ` · nhận tại ${o.cluster.name}` : ""}</p>
        </div>
      </div>

      <section className="m3-card-filled anim-in" style={{ padding: 22, borderRadius: "var(--shape-xl)", background: "var(--md-primary-container)", color: "var(--md-on-primary-container)" }}>
        <p className="label-md" style={{ textTransform: "uppercase", opacity: 0.8, marginBottom: 4 }}>Thời gian cắt rau</p>
        {o.harvested_at ? (
          <p className="headline-md tabular">{formatClock(o.harvested_at)} · {formatYMD(o.delivery_date)}</p>
        ) : (
          <p className="title-lg">{o.allocated ? `Sẽ cắt lúc 4h00 sáng ${formatYMD(o.delivery_date, { day: "numeric", month: "numeric" })}` : "Chưa tới giờ chốt sổ 18h00, rau còn ngoài vườn"}</p>
        )}
        <p className="body-md" style={{ opacity: 0.85, marginTop: 4 }}>Rau chỉ được cắt sau khi đã có người đặt, đúng số ký cần, nên không có rau tồn kho.</p>
      </section>

      <section className="m3-card-filled anim-in delay-1" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}>
        <p className="label-md text-on-surface-variant" style={{ textTransform: "uppercase", marginBottom: 14 }}>Hành trình</p>
        <OrderTimeline status={o.status} farmer={farmer} allocated={o.allocated} times={{ placed: o.created_at, harvested: o.harvested_at, loaded: o.loaded_at, delivered: o.delivered_at }} />
      </section>

      {o.farms.length > 0 && (
        <section className="anim-in delay-1">
          <div className="m3-section-head"><h2 className="headline-sm text-on-surface"><Icon name="potted_plant" filled /> Nông trại</h2><span className="body-sm text-on-surface-variant">{o.farms.length} vườn góp rau cho hộp này</span></div>
          <div className="m3-list-group stagger">
            {o.farms.map((f) => {
              const full = covers.get(f.slug);
              return (
                <Link key={f.slug} href={`/farms/${f.slug}`} className="m3-list-item">
                  <span className="m3-media-wrap" style={{ width: 56, height: 56, borderRadius: "var(--shape-md)", flexShrink: 0, display: "block", background: "var(--md-primary-container)" }}>{full?.cover_url && <SmartImage src={full.cover_url} alt={f.name} />}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block" }}>{f.name}</span>
                    <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{addressFarmer(f.farmer).call} · {f.location}</span>
                  </span>
                  <span className={`m3-chip sm round ${f.confirmed ? "m3-chip-primary" : "m3-chip-surface"}`}><Icon name={f.confirmed ? "check_circle" : "schedule"} size={14} filled /> {f.confirmed ? "Đã nhận lệnh" : "Chờ xác nhận"}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <BoxContents items={o.contents} title="Trong hộp này" />
      <BoxMenu plan={o.box.meal_plan} title="Thực đơn kèm hộp" />

      <section className="m3-card-outlined anim-in" style={{ padding: 18, borderRadius: "var(--shape-xl)", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/qr/${o.id}`} alt={`Mã QR hộp #${code}`} width={120} height={120} style={{ borderRadius: 12, background: "#fff", padding: 6, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <p className="title-md text-on-surface">Mã QR của hộp này</p>
          <p className="body-sm text-on-surface-variant" style={{ marginTop: 2 }}>In trên bao bì. Trang này chỉ hiện nguồn gốc và hành trình, không có thông tin người mua.</p>
          <a href={`/api/qr/${o.id}`} download={`xanh-tan-tay-${code}.svg`} className="m3-btn m3-btn-tonal m3-btn-sm" style={{ marginTop: 10 }}><Icon name="download" size={18} /><span>Tải mã QR</span></a>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 justify-center">
        <Link href={`/hop-rau/${o.box.slug}`} className="m3-btn m3-btn-filled"><Icon name="inventory_2" filled /><span>Đặt hộp này</span></Link>
        <Link href="/" className="m3-btn m3-btn-text"><span>Về Xanh Tận Tay</span></Link>
      </div>
    </main>
  );
}
