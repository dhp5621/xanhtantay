export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/db";
import { orders, farms, products, subscriptions, users } from "@/db/schema";
import { eq, and, count, desc, sum } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { Icon } from "@/components/ui/Icon";
import { formatVND, formatDate, STATUS_SHORT, STATUS_ICONS } from "@/lib/format";
import { OrderStatusButton } from "@/components/farmer/OrderStatusButton";

export const metadata = { title: "Tổng quan vườn" };

export default async function FarmerDashboard() {
  const user = (await getSessionUser())!; // layout guarantees a farmer session
  const [myFarm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));

  let stats = { pending: 0, total: 0, products: 0, subs: 0, revenue: 0 };
  let recent: { order: typeof orders.$inferSelect; customer: { name: string } | null }[] = [];
  if (myFarm) {
    const [[pending], [total], [prods], [subs], [rev], rec] = await Promise.all([
      db.select({ c: count() }).from(orders).where(and(eq(orders.farm_id, myFarm.id), eq(orders.status, "harvesting"))),
      db.select({ c: count() }).from(orders).where(eq(orders.farm_id, myFarm.id)),
      db.select({ c: count() }).from(products).where(eq(products.farm_id, myFarm.id)),
      db.select({ c: count() }).from(subscriptions).where(and(eq(subscriptions.farm_id, myFarm.id), eq(subscriptions.active, true))),
      db.select({ s: sum(orders.total) }).from(orders).where(and(eq(orders.farm_id, myFarm.id), eq(orders.status, "delivered"))),
      db.select({ order: orders, customer: { name: users.name } }).from(orders).leftJoin(users, eq(orders.user_id, users.id))
        .where(eq(orders.farm_id, myFarm.id)).orderBy(desc(orders.created_at)).limit(4),
    ]);
    stats = { pending: pending.c, total: total.c, products: prods.c, subs: subs.c, revenue: Number(rev.s ?? 0) };
    recent = rec;
  }

  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Chào buổi sáng" : hour < 17 ? "Chào buổi chiều" : "Chào buổi tối";

  const tiles = [
    { icon: "pending_actions", label: "Đơn chờ thu hoạch", value: stats.pending, href: "/farmer/don-hang", bg: "var(--md-tertiary-container)", fg: "var(--md-on-tertiary-container)" },
    { icon: "package_2", label: "Tổng đơn hàng", value: stats.total, href: "/farmer/don-hang", bg: "var(--md-secondary-container)", fg: "var(--md-on-secondary-container)" },
    { icon: "eco", label: "Sản phẩm", value: stats.products, href: "/farmer/san-pham", bg: "var(--md-primary-container)", fg: "var(--md-on-primary-container)" },
    { icon: "event_repeat", label: "Khách đăng ký", value: stats.subs, href: "/farmer/dang-ky", bg: "var(--md-surface-container-highest)", fg: "var(--md-on-surface)" },
  ];

  const quickLinks = [
    { href: "/farmer/nhat-ky", icon: "photo_camera", label: "Đăng nhật ký hôm nay", desc: "Khách tin hơn khi thấy vườn mỗi ngày" },
    { href: "/farmer/san-pham", icon: "inventory_2", label: "Cập nhật tồn kho", desc: "Bật/tắt món còn hàng" },
    { href: "/farmer/don-hang", icon: "local_shipping", label: "Xử lý đơn mới", desc: `${stats.pending} đơn đang chờ` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="anim-in">
        <p className="m3-eyebrow">{myFarm ? `${myFarm.name} · ${myFarm.location}` : "Chưa có vườn"}</p>
        <h1 className="headline-lg text-on-surface">{greeting}, {user.name?.split(" ").pop()}!</h1>
      </div>

      {!myFarm && (
        <div className="m3-card-filled anim-in" style={{ padding: 20, borderRadius: "var(--shape-xl)", background: "var(--md-error-container)", color: "var(--md-on-error-container)" }}>
          Tài khoản này chưa gắn với vườn nào. Liên hệ quản trị để tạo vườn.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="m3-card-action lift" style={{ background: tile.bg, color: tile.fg, borderRadius: "var(--shape-xl)", padding: "20px 20px 18px" }}>
            <Icon name={tile.icon} size={28} filled />
            <p className="display-sm tabular" style={{ marginTop: 8, lineHeight: 1 }}>{tile.value}</p>
            <p className="body-sm" style={{ marginTop: 6, opacity: 0.85 }}>{tile.label}</p>
          </Link>
        ))}
      </div>

      {stats.revenue > 0 && (
        <div className="m3-hero anim-in delay-2" style={{ padding: "24px 28px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span className="m3-list-leading" style={{ width: 56, height: 56, background: "var(--md-primary)", color: "var(--md-on-primary)" }}><Icon name="payments" size={30} filled /></span>
          <div style={{ position: "relative" }}>
            <p className="label-md" style={{ color: "var(--md-on-primary-container)", opacity: 0.8, textTransform: "uppercase" }}>Doanh thu đã giao</p>
            <p className="display-sm tabular" style={{ color: "var(--md-on-primary-container)" }}>{formatVND(stats.revenue)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <section className="lg:col-span-3">
          <div className="m3-section-head">
            <h2 className="title-lg text-on-surface"><Icon name="receipt_long" filled /> Đơn gần đây</h2>
            <Link href="/farmer/don-hang" className="m3-btn m3-btn-text m3-btn-sm"><span>Tất cả</span><Icon name="arrow_forward" size={18} /></Link>
          </div>
          {recent.length === 0 ? (
            <p className="body-md text-on-surface-variant">Chưa có đơn nào.</p>
          ) : (
            <div className="m3-list-group stagger">
              {recent.map(({ order, customer }) => (
                <div key={order.id} className="m3-list-item" style={{ cursor: "default", flexWrap: "wrap" }}>
                  <span className="m3-avatar sm">{customer?.name?.trim()?.[0]?.toUpperCase() ?? "?"}</span>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <p className="title-sm">{customer?.name ?? "Khách hàng"}</p>
                    <p className="body-sm text-on-surface-variant">{formatDate(order.created_at, { day: "numeric", month: "short" })} · {formatVND(order.total)}</p>
                  </div>
                  <span className={`status-pill status-${order.status}`}><Icon name={STATUS_ICONS[order.status]} size={16} filled />{STATUS_SHORT[order.status]}</span>
                  {order.status !== "delivered" && <OrderStatusButton orderId={order.id} status={order.status} />}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-2">
          <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="bolt" filled /> Thao tác nhanh</h2></div>
          <div className="m3-list-group stagger">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="m3-list-item">
                <span className="m3-list-leading"><Icon name={link.icon} /></span>
                <span>
                  <span style={{ display: "block" }}>{link.label}</span>
                  <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{link.desc}</span>
                </span>
                <span className="m3-list-trailing"><Icon name="chevron_right" /></span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
