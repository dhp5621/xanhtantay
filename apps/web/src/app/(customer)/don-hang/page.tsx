export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getOrdersForUser } from "@/lib/queries";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { CancelOrderButton } from "@/components/order/CancelOrderButton";
import { formatVND, ORDER_TYPE_LABELS, ORDER_TYPE_ICONS, STATUS_SHORT, STATUS_ICONS } from "@/lib/format";
import { addressFarmer, formatYMD } from "@/lib/commerce";

export const metadata = { title: "Đơn hàng của tôi" };

export default async function DonHangPage() {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?next=/don-hang&role=customer");
  const orders = await getOrdersForUser(user.id);

  return (
    <div>
      <PageHeader icon="package_2" eyebrow="Hành trình hộp rau" title="Đơn hàng của tôi" subtitle="4h thu hoạch, 6h lên xe lạnh, 16h có tại sảnh" />
      {orders.length === 0 ? (
        <EmptyState icon="inventory_2" title="Chưa có hộp rau nào" description="Chọn một hộp theo mùa, đặt trước 18h00 là mai có rau." action={<Link href="/hop-rau" className="m3-btn m3-btn-filled"><Icon name="inventory_2" /><span>Chọn hộp rau</span></Link>} />
      ) : (
        <div className="flex flex-col gap-4 stagger">
          {orders.map((o) => (
            <article key={o.id} className="m3-card-elevated" style={{ padding: "22px 24px", borderRadius: "var(--shape-xl)", opacity: o.status === "cancelled" ? 0.65 : 1 }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div style={{ minWidth: 0 }}>
                  <Link href={`/don-hang/${o.id}`} className="title-lg text-on-surface" style={{ textDecoration: "none", display: "block", marginBottom: 6 }}>{o.quantity} × {o.box.name}</Link>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="m3-chip sm m3-chip-surface round"><Icon name={ORDER_TYPE_ICONS[o.type]} size={14} /> {ORDER_TYPE_LABELS[o.type]}</span>
                    <span className={`status-pill status-${o.status}`}><Icon name={STATUS_ICONS[o.status]} size={16} filled />{STATUS_SHORT[o.status]}</span>
                    {o.ship_fee === 0 && o.status !== "cancelled" && <span className="m3-chip sm m3-chip-primary round"><Icon name="local_shipping" size={14} filled /> Miễn ship</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p className="headline-sm text-primary tabular">{formatVND(o.total)}</p>
                  <p className="body-sm text-on-surface-variant">Giao {formatYMD(o.delivery_date)}{o.cluster ? ` · ${o.cluster.name}` : ""}</p>
                </div>
              </div>

              {o.status !== "cancelled" && <div style={{ marginTop: 18 }}><OrderTimeline status={o.status} compact farmer={o.farmers[0] ? addressFarmer(o.farmers[0].farmer).call.replace(/^./, (c) => c.toLowerCase()) : null} /></div>}

              <div className="flex flex-wrap gap-2" style={{ marginTop: 14 }}>
                <Link href={`/don-hang/${o.id}`} className="m3-btn m3-btn-tonal-primary m3-btn-sm"><Icon name="menu_book" size={18} /><span>Hành trình & thực đơn</span></Link>
                <Link href={`/tra-cuu/${o.id}`} className="m3-btn m3-btn-outlined m3-btn-sm"><Icon name="qr_code_2" size={18} /><span>Mã QR</span></Link>
                {o.status === "placed" && !o.allocated && <CancelOrderButton orderId={o.id} />}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
