export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/db";
import { users, farms, products, orders, subscriptions, group_orders, farm_diary } from "@/db/schema";
import { and, count, desc, eq, lte, sum } from "drizzle-orm";
import { Icon } from "@/components/ui/Icon";
import { formatVND, formatDateTime, STATUS_SHORT, STATUS_ICONS } from "@/lib/format";

export const metadata = { title: "Tổng quan" };

export default async function AdminDashboard() {
  const [[u], [f], [p], [o], [pending], [rev], [s], [g], [low], [d], recent] = await Promise.all([
    db.select({ c: count() }).from(users),
    db.select({ c: count() }).from(farms),
    db.select({ c: count() }).from(products),
    db.select({ c: count() }).from(orders),
    db.select({ c: count() }).from(orders).where(eq(orders.status, "harvesting")),
    db.select({ s: sum(orders.total) }).from(orders).where(eq(orders.status, "delivered")),
    db.select({ c: count() }).from(subscriptions).where(eq(subscriptions.active, true)),
    db.select({ c: count() }).from(group_orders).where(eq(group_orders.status, "open")),
    db.select({ c: count() }).from(products).where(and(eq(products.in_stock, true), lte(products.stock_qty, 5))),
    db.select({ c: count() }).from(farm_diary),
    db.select({ order: orders, farm: { name: farms.name }, customer: { name: users.name } }).from(orders)
      .leftJoin(farms, eq(orders.farm_id, farms.id)).leftJoin(users, eq(orders.user_id, users.id)).orderBy(desc(orders.created_at)).limit(8),
  ]);
  const revenue = Number(rev.s ?? 0);
  const commission = Math.round(revenue * 0.075); // midpoint of the 5–10% model

  const tiles = [
    { icon: "payments", label: "GMV đã giao", value: formatVND(revenue), href: "/admin/orders", tone: "primary" },
    { icon: "percent", label: "Hoa hồng ước tính (7,5%)", value: formatVND(commission), href: "/admin/orders", tone: "tertiary" },
    { icon: "pending_actions", label: "Đơn chờ thu hoạch", value: pending.c, href: "/admin/orders", tone: "secondary" },
    { icon: "package_2", label: "Tổng đơn", value: o.c, href: "/admin/orders", tone: "surface" },
    { icon: "group", label: "Người dùng", value: u.c, href: "/admin/users", tone: "surface" },
    { icon: "potted_plant", label: "Vườn", value: f.c, href: "/admin/farms", tone: "surface" },
    { icon: "eco", label: "Sản phẩm", value: p.c, href: "/admin/products", tone: "surface" },
    { icon: "event_repeat", label: "Gói đang chạy", value: s.c, href: "/admin/subscriptions", tone: "surface" },
    { icon: "groups", label: "Nhóm gom mở", value: g.c, href: "/admin/group_orders", tone: "surface" },
    { icon: "auto_stories", label: "Bài nhật ký", value: d.c, href: "/admin/diary", tone: "surface" },
    { icon: "priority_high", label: "Sắp hết hàng (≤5)", value: low.c, href: "/admin/products", tone: low.c > 0 ? "error" : "surface" },
  ];
  const toneStyle = (t: string) =>
    t === "surface" ? { background: "var(--md-surface-container-high)", color: "var(--md-on-surface)" }
    : { background: `var(--md-${t}-container)`, color: `var(--md-on-${t}-container)` };

  return (
    <div className="flex flex-col gap-8">
      <div className="anim-in">
        <p className="m3-eyebrow" style={{ color: "var(--md-tertiary)" }}>Bảng điều khiển</p>
        <h1 className="headline-lg text-on-surface">Tổng quan nền tảng</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 stagger">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="m3-card-action lift" style={{ ...toneStyle(t.tone), borderRadius: "var(--shape-xl)", padding: "18px 20px" }}>
            <Icon name={t.icon} size={26} filled />
            <p className="headline-md tabular" style={{ marginTop: 6, lineHeight: 1.1 }}>{t.value}</p>
            <p className="body-sm" style={{ marginTop: 6, opacity: 0.8 }}>{t.label}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="m3-section-head">
          <h2 className="title-lg text-on-surface"><Icon name="receipt_long" filled /> Đơn mới nhất</h2>
          <Link href="/admin/orders" className="m3-btn m3-btn-text m3-btn-sm"><span>Tất cả</span><Icon name="arrow_forward" size={18} /></Link>
        </div>
        <div className="m3-list-group stagger">
          {recent.map(({ order, farm, customer }) => (
            <div key={order.id} className="m3-list-item" style={{ cursor: "default", flexWrap: "wrap" }}>
              <span className="m3-avatar sm">{customer?.name?.trim()?.[0]?.toUpperCase() ?? "?"}</span>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p className="title-sm">{customer?.name ?? "Khách"} → {farm?.name ?? "Vườn"}</p>
                <p className="body-sm text-on-surface-variant">{formatDateTime(order.created_at)}{order.note ? ` · ${order.note}` : ""}</p>
              </div>
              <span className={`status-pill status-${order.status}`}><Icon name={STATUS_ICONS[order.status]} size={16} filled />{STATUS_SHORT[order.status]}</span>
              <span className="title-md text-primary tabular" style={{ minWidth: 90, textAlign: "right" }}>{formatVND(order.total)}</span>
            </div>
          ))}
          {recent.length === 0 && <p className="body-md text-on-surface-variant">Chưa có đơn nào.</p>}
        </div>
      </section>
    </div>
  );
}
