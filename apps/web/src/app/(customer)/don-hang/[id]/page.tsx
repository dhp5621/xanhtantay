export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getOrderTrace } from "@/lib/queries";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { CancelOrderButton } from "@/components/order/CancelOrderButton";
import { BoxContents } from "@/components/box/BoxContents";
import { BoxMenu } from "@/components/box/BoxMenu";
import { formatVND, ORDER_TYPE_LABELS } from "@/lib/format";
import { addressFarmer, formatYMD } from "@/lib/commerce";

export const metadata = { title: "Hộp rau của tôi" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/dang-nhap?next=/don-hang/${id}&role=customer`);
  const o = await getOrderTrace(id);
  if (!o || o.user_id !== user.id) notFound();
  const farmer = o.farms[0] ? addressFarmer(o.farms[0].farmer).call.replace(/^./, (c) => c.toLowerCase()) : null;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <Link href="/don-hang" className="m3-btn m3-btn-text m3-btn-sm anim-in" style={{ alignSelf: "flex-start", marginLeft: -12, marginBottom: -12 }}><Icon name="arrow_back" size={18} /><span>Đơn hàng</span></Link>
      <PageHeader icon="inventory_2" eyebrow={`${ORDER_TYPE_LABELS[o.type]} · giao ${formatYMD(o.delivery_date)}`} title={`${o.quantity} × ${o.box.name}`} subtitle={o.cluster ? `Nhận tại sảnh ${o.cluster.name}${o.address ? ` · ${o.address}` : ""}` : undefined} />

      {o.care_message && <p className="m3-care anim-in">{o.care_message}<small>Lời nhắn từ quê</small></p>}

      <section className="m3-card-filled anim-in delay-1" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}>
        <p className="label-md text-on-surface-variant" style={{ textTransform: "uppercase", marginBottom: 14 }}>Hành trình</p>
        <OrderTimeline status={o.status} farmer={farmer} allocated={o.allocated} times={{ placed: o.created_at, harvested: o.harvested_at, loaded: o.loaded_at, delivered: o.delivered_at }} />
        {o.farms.length > 0 && (
          <p className="body-sm text-on-surface-variant" style={{ marginTop: 14 }}>
            <Icon name="potted_plant" size={14} /> Hộp này được cắt bởi {o.farms.map((f, i) => <span key={f.slug}>{i > 0 && ", "}<Link href={`/farms/${f.slug}`} className="text-primary" style={{ textDecoration: "none", fontWeight: 600 }}>{addressFarmer(f.farmer).call}</Link> ({f.location})</span>)}.
          </p>
        )}
      </section>

      <section className="m3-card-outlined anim-in delay-2" style={{ padding: 18, borderRadius: "var(--shape-xl)", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/qr/${o.id}`} alt="Mã QR hộp rau" width={120} height={120} style={{ borderRadius: 12, background: "#fff", padding: 6, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <p className="title-md text-on-surface">Mã QR trên bao bì</p>
          <p className="body-sm text-on-surface-variant" style={{ marginTop: 2 }}>Quét để xem rau cắt lúc nào, từ vườn nào. Mã #{o.id.slice(0, 8).toUpperCase()}</p>
          <Link href={`/tra-cuu/${o.id}`} className="m3-btn m3-btn-tonal m3-btn-sm" style={{ marginTop: 10 }}><Icon name="qr_code_2" size={18} /><span>Xem trang truy xuất</span></Link>
        </div>
        <div style={{ textAlign: "right", minWidth: 160 }}>
          <p className="body-sm text-on-surface-variant">Hộp rau {formatVND(o.subtotal)}</p>
          <p className="body-sm text-on-surface-variant">Giao tới sảnh {o.ship_fee ? formatVND(o.ship_fee) : "miễn phí"}</p>
          <p className="headline-sm text-primary tabular">{formatVND(o.total)}</p>
          {o.status === "placed" && !o.allocated && <div style={{ marginTop: 8 }}><CancelOrderButton orderId={o.id} /></div>}
        </div>
      </section>

      <BoxContents items={o.contents} title="Trong hộp của bạn" />
      <BoxMenu plan={o.box.meal_plan} title="Ăn gì mấy ngày tới" />
    </div>
  );
}
