export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { subscriptions, farms, products } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubscriptionActions } from "@/components/subscription/SubscriptionActions";
import { formatDate, formatVND } from "@/lib/format";

export const metadata = { title: "Gói đăng ký" };

export default async function DangKyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?next=/dang-ky");

  const mySubs = await db.select({ sub: subscriptions, farm: farms }).from(subscriptions)
    .leftJoin(farms, eq(subscriptions.farm_id, farms.id)).where(eq(subscriptions.user_id, user.id));

  // Resolve product names/prices (the page used to print raw product ids).
  const productIds = Array.from(new Set(mySubs.flatMap(({ sub }) => sub.items.map((i) => i.product_id))));
  const prods = productIds.length ? await db.select().from(products).where(inArray(products.id, productIds)) : [];
  const byId = new Map(prods.map((p) => [p.id, p]));

  const freqLabel = { weekly: "Mỗi tuần", monthly: "Mỗi tháng" };

  return (
    <div>
      <PageHeader icon="event_repeat" eyebrow="Tự động, đúng hẹn" title="Gói đăng ký" subtitle="Rau củ giao định kỳ, không cần đặt lại" />

      {mySubs.length === 0 ? (
        <EmptyState icon="event_repeat" title="Chưa có gói đăng ký nào" description="Thêm món vào giỏ ở trang vườn, rồi bấm “Giao định kỳ” để tạo gói tuần / tháng." action={<Link href="/farms" className="m3-btn m3-btn-filled"><Icon name="potted_plant" /><span>Chọn vườn rau</span></Link>} />
      ) : (
        <div className="flex flex-col gap-4 stagger">
          {mySubs.map(({ sub, farm }) => {
            const est = sub.items.reduce((s, i) => s + (byId.get(i.product_id)?.price_per_unit ?? 0) * i.quantity, 0);
            return (
              <article key={sub.id} className="m3-card-elevated" style={{ padding: "22px 24px", borderRadius: "var(--shape-xl)", opacity: sub.active ? 1 : 0.75 }}>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <p className="title-lg text-on-surface" style={{ marginBottom: 6 }}>{farm?.name}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="m3-chip sm m3-chip-primary round"><Icon name={sub.frequency === "weekly" ? "date_range" : "calendar_month"} size={16} /> {freqLabel[sub.frequency]}</span>
                      <span className={`m3-chip sm round ${sub.active ? "m3-chip-secondary" : "m3-chip-error"}`}>
                        <Icon name={sub.active ? "check_circle" : "pause_circle"} size={16} filled /> {sub.active ? "Đang hoạt động" : "Đã tạm dừng"}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="body-sm text-on-surface-variant">Giao tiếp theo</p>
                    <p className="title-md text-primary">{formatDate(sub.next_delivery, { weekday: "long", day: "numeric", month: "long" })}</p>
                  </div>
                </div>

                {sub.items.length > 0 && (
                  <div className="m3-card-filled" style={{ marginTop: 14, padding: "12px 16px", borderRadius: "var(--shape-md)" }}>
                    <p className="label-md text-on-surface-variant" style={{ marginBottom: 6, textTransform: "uppercase" }}>Giỏ hàng định kỳ · ~{formatVND(est)}</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      {sub.items.map((item, i) => {
                        const p = byId.get(item.product_id);
                        return (
                          <li key={i} className="body-md text-on-surface" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span>{item.quantity} {p?.unit ?? "×"} {p?.name ?? "Sản phẩm không còn"}</span>
                            {p && <span className="tabular text-on-surface-variant">{formatVND(p.price_per_unit * item.quantity)}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div style={{ marginTop: 14 }}>
                  <SubscriptionActions id={sub.id} active={sub.active} farmSlug={farm?.slug} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
