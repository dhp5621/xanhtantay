export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { orders, farms, users, order_items, products } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { getOrderStatusLabel, ORDER_STATUS_LABELS, OrderStatus } from "@xanhtantay/types";
import { getSessionUser } from "@/lib/session";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatVND, formatDate, ORDER_TYPE_LABELS, STATUS_ICONS, stripEmoji } from "@/lib/format";

export const metadata = { title: "Đơn hàng của tôi" };
const STEPS = ["harvesting", "loaded", "delivered"] as const;
const STEP_LABELS = ["Thu hoạch", "Lên xe", "Đã giao"];

export default async function DonHangPage() {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?next=/don-hang");

  const myOrders = await db
    .select({ order: orders, farm: farms, farmer: { name: users.name } })
    .from(orders)
    .leftJoin(farms, eq(orders.farm_id, farms.id))
    .leftJoin(users, eq(farms.owner_id, users.id))
    .where(eq(orders.user_id, user.id))
    .orderBy(desc(orders.created_at));

  const items = myOrders.length
    ? await db.select({ item: order_items, product: { name: products.name, unit: products.unit } })
        .from(order_items).leftJoin(products, eq(order_items.product_id, products.id))
        .where(inArray(order_items.order_id, myOrders.map((o) => o.order.id)))
    : [];
  const itemsByOrder = new Map<string, typeof items>();
  for (const it of items) (itemsByOrder.get(it.item.order_id) ?? itemsByOrder.set(it.item.order_id, []).get(it.item.order_id)!).push(it);

  return (
    <div>
      <PageHeader icon="package_2" eyebrow="Hành trình rau củ" title="Đơn hàng của tôi" subtitle="Theo dõi rau từ vườn đến nhà bạn" />

      {myOrders.length === 0 ? (
        <EmptyState icon="grocery" title="Chưa có đơn hàng nào" description="Khám phá các vườn rau và đặt đơn đầu tiên nhé!" action={<Link href="/farms" className="m3-btn m3-btn-filled"><Icon name="potted_plant" /><span>Chọn vườn rau</span></Link>} />
      ) : (
        <div className="flex flex-col gap-4 stagger">
          {myOrders.map(({ order, farm, farmer }) => {
            const currentIdx = STEPS.indexOf(order.status);
            const lines = itemsByOrder.get(order.id) ?? [];
            return (
              <article key={order.id} className="m3-card-elevated" style={{ padding: "22px 24px", borderRadius: "var(--shape-xl)" }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div style={{ minWidth: 0 }}>
                    <p className="title-lg text-on-surface" style={{ marginBottom: 6 }}>{farm?.name ?? "Vườn rau"}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="m3-chip sm m3-chip-surface round">{ORDER_TYPE_LABELS[order.type] ?? order.type}</span>
                      <span className={`status-pill status-${order.status}`}>
                        <Icon name={STATUS_ICONS[order.status]} size={16} filled />
                        {stripEmoji(getOrderStatusLabel(order.status as OrderStatus, farmer?.name))}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="headline-sm text-primary tabular">{formatVND(order.total)}</p>
                    <p className="body-sm text-on-surface-variant">{formatDate(order.created_at, { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>

                {lines.length > 0 && (
                  <p className="body-sm text-on-surface-variant" style={{ marginTop: 10 }}>
                    {lines.map((l) => `${Number(l.item.quantity)} ${l.product?.unit ?? ""} ${l.product?.name ?? "sản phẩm"}`).join(" · ")}
                  </p>
                )}
                {order.note && (
                  <p className="body-sm text-on-surface-variant" style={{ marginTop: 4, display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <Icon name="sticky_note_2" size={16} /> {order.note}
                  </p>
                )}

                {/* Stepper */}
                <div className="flex items-center" style={{ marginTop: 20, padding: "0 8px" }}>
                  {STEPS.map((step, i) => {
                    const done = i < currentIdx;
                    const current = i === currentIdx;
                    return (
                      <div key={step} style={{ display: "contents" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 72 }}>
                          <span className={`m3-step-dot ${done ? "done" : ""} ${current ? "current" : ""}`}>
                            {done ? <Icon name="check" size={20} bold /> : <Icon name={STATUS_ICONS[step]} size={20} filled={current} />}
                          </span>
                          <span className="label-sm" style={{ color: done || current ? "var(--md-primary)" : "var(--md-on-surface-variant)", letterSpacing: 0 }}>{STEP_LABELS[i]}</span>
                        </div>
                        {i < STEPS.length - 1 && <div className={`m3-step-line ${i < currentIdx ? "done" : ""}`} style={{ marginBottom: 22 }} />}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
