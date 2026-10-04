export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getSubscriptionsForUser } from "@/lib/queries";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubscriptionActions } from "@/components/subscription/SubscriptionActions";
import { formatVND } from "@/lib/format";
import { FREQUENCY_LABELS, canMoveDelivery, deliveryDates, formatYMD, nextDeliveryDate, shipFeeFor } from "@/lib/commerce";

export const metadata = { title: "Gói định kỳ" };

export default async function DinhKyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?next=/dinh-ky&role=customer");
  const subs = await getSubscriptionsForUser(user.id);
  // Delivery days (Wednesday, Sunday) the next box of a subscription may be moved to: four weeks from the earliest open one.
  const moveDates = deliveryDates(nextDeliveryDate(), 28);
  return (
    <div>
      <PageHeader icon="event_repeat" eyebrow="Tự động, đúng hẹn, thứ Tư hoặc Chủ nhật" title="Gói định kỳ" subtitle="Hộp rau tự về mỗi kỳ, bạn chỉ cần ra điểm nhận. Tạm dừng hoặc dời ngày giao trước giờ chốt sổ 24 giờ." />
      {subs.length === 0 ? (
        <EmptyState icon="event_repeat" title="Chưa có gói định kỳ" description="Chọn một hộp rau rồi bấm “Gói định kỳ” để rau tự về mỗi tuần." action={<Link href="/hop-rau" className="m3-btn m3-btn-filled"><Icon name="inventory_2" /><span>Chọn hộp rau</span></Link>} />
      ) : (
        <div className="flex flex-col gap-4 stagger">
          {subs.map((s) => (
            <article key={s.id} className="m3-card-elevated" style={{ padding: "22px 24px", borderRadius: "var(--shape-xl)", opacity: s.active ? 1 : 0.75 }}>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <Link href={`/hop-rau/${s.box.slug}`} className="title-lg text-on-surface" style={{ textDecoration: "none", display: "block", marginBottom: 6 }}>{s.box.name}</Link>
                  <div className="flex gap-2 flex-wrap">
                    <span className="m3-chip sm m3-chip-primary round"><Icon name="date_range" size={16} /> {FREQUENCY_LABELS[s.frequency]}</span>
                    <span className={`m3-chip sm round ${s.active ? "m3-chip-secondary" : "m3-chip-error"}`}><Icon name={s.active ? "check_circle" : "pause_circle"} size={16} filled /> {s.active ? "Đang chạy" : "Tạm dừng"}</span>
                    {s.cluster && <span className="m3-chip sm m3-chip-surface round"><Icon name="apartment" size={16} /> {s.cluster.name}{s.address ? ` · ${s.address}` : ""}</span>}
                    {s.recipient_name && <span className="m3-chip sm m3-chip-surface round"><Icon name="redeem" size={16} /> Gửi cho {s.recipient_name}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p className="body-sm text-on-surface-variant">{s.active ? "Hộp tiếp theo" : "Sẽ giao lại khi chạy"}</p>
                  <p className="title-md text-primary">{formatYMD(s.next_delivery)}</p>
                  <p className="body-sm text-on-surface-variant tabular">{formatVND(s.box.price * s.quantity + shipFeeFor(s.box.size, s.quantity))} / kỳ, gồm {formatVND(shipFeeFor(s.box.size, s.quantity))} phí giao</p>
                </div>
              </div>
              <div style={{ marginTop: 14 }}><SubscriptionActions id={s.id} active={s.active} quantity={s.quantity} frequency={s.frequency} nextDelivery={s.next_delivery} moveDates={moveDates} canMove={s.active && canMoveDelivery(s.next_delivery)} /></div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
