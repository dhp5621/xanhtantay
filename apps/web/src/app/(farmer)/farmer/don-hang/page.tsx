export const dynamic = "force-dynamic";
import { db } from "@/db";
import { orders, farms, users, order_items, products } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderStatusButton } from "@/components/farmer/OrderStatusButton";
import { formatVND, formatDate, STATUS_SHORT, STATUS_ICONS, ORDER_TYPE_LABELS } from "@/lib/format";

export const metadata = { title: "Đơn hàng" };
const ORDER = { harvesting: 0, loaded: 1, delivered: 2 } as const;

export default async function FarmerDonHangPage() {
  const user = (await getSessionUser())!;
  const [myFarm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));

  const farmOrders = myFarm
    ? await db.select({ order: orders, customer: { name: users.name, phone: users.phone } }).from(orders)
        .leftJoin(users, eq(orders.user_id, users.id)).where(eq(orders.farm_id, myFarm.id)).orderBy(desc(orders.created_at))
    : [];
  // Active orders first, then delivered.
  farmOrders.sort((a, b) => ORDER[a.order.status] - ORDER[b.order.status]);

  const items = farmOrders.length
    ? await db.select({ item: order_items, product: { name: products.name, unit: products.unit } }).from(order_items)
        .leftJoin(products, eq(order_items.product_id, products.id)).where(inArray(order_items.order_id, farmOrders.map((o) => o.order.id)))
    : [];
  const byOrder = new Map<string, typeof items>();
  for (const it of items) (byOrder.get(it.item.order_id) ?? byOrder.set(it.item.order_id, []).get(it.item.order_id)!).push(it);

  const pending = farmOrders.filter((o) => o.order.status !== "delivered").length;

  return (
    <div>
      <PageHeader icon="package_2" eyebrow={pending ? `${pending} đơn cần xử lý` : "Mọi đơn đã giao"} title="Đơn hàng" subtitle="Cập nhật trạng thái để khách theo dõi hành trình rau" />

      {farmOrders.length === 0 ? (
        <EmptyState icon="inbox" title="Chưa có đơn hàng nào" description="Đăng nhật ký vườn để khách biết đến bạn nhiều hơn." />
      ) : (
        <div className="flex flex-col gap-3 stagger">
          {farmOrders.map(({ order, customer }) => (
            <article key={order.id} className="m3-card-elevated" style={{ padding: "18px 22px", borderRadius: "var(--shape-xl)", opacity: order.status === "delivered" ? 0.8 : 1 }}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                  <span className="m3-avatar">{customer?.name?.trim()?.[0]?.toUpperCase() ?? "?"}</span>
                  <div>
                    <p className="title-md text-on-surface">{customer?.name ?? "Khách hàng"}</p>
                    <p className="body-sm text-on-surface-variant">{customer?.phone ?? "—"} · {ORDER_TYPE_LABELS[order.type]} · {formatDate(order.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p className="title-lg text-primary tabular">{formatVND(order.total)}</p>
                  <span className={`status-pill status-${order.status}`}><Icon name={STATUS_ICONS[order.status]} size={16} filled />{STATUS_SHORT[order.status]}</span>
                </div>
              </div>

              {(byOrder.get(order.id)?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
                  {byOrder.get(order.id)!.map((l) => (
                    <span key={l.item.id} className="m3-chip sm m3-chip-surface"><strong>{Number(l.item.quantity)} {l.product?.unit}</strong>&nbsp;{l.product?.name}</span>
                  ))}
                </div>
              )}
              {order.note && (
                <p className="body-sm text-on-surface-variant" style={{ marginTop: 8, display: "inline-flex", gap: 4, alignItems: "center" }}>
                  <Icon name="sticky_note_2" size={16} /> {order.note}
                </p>
              )}

              {order.status !== "delivered" && (
                <div style={{ marginTop: 14 }}>
                  <OrderStatusButton orderId={order.id} status={order.status} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
