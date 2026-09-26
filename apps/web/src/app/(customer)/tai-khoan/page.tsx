export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { orders, subscriptions, group_order_members, farms, products } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { Icon } from "@/components/ui/Icon";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const metadata = { title: "Tài khoản" };

interface Stat { icon: string; label: string; value: number; href: string }
interface MenuItem { href: string; icon: string; label: string; desc: string }

export default async function TaiKhoanPage() {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?next=/tai-khoan");

  let stats: Stat[];
  let menuItems: MenuItem[];
  let subtitle: string | null = null;

  if (user.role === "farmer") {
    // Farmers get the farm-management view, not the buyer menu.
    const [myFarm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));
    const [[pending], [prods], [subs]] = myFarm
      ? await Promise.all([
          db.select({ c: count() }).from(orders).where(and(eq(orders.farm_id, myFarm.id), eq(orders.status, "harvesting"))),
          db.select({ c: count() }).from(products).where(eq(products.farm_id, myFarm.id)),
          db.select({ c: count() }).from(subscriptions).where(and(eq(subscriptions.farm_id, myFarm.id), eq(subscriptions.active, true))),
        ])
      : [[{ c: 0 }], [{ c: 0 }], [{ c: 0 }]];
    subtitle = myFarm ? `${myFarm.name} · ${myFarm.location}` : "Chưa gắn với vườn nào";
    stats = [
      { icon: "pending_actions", label: "Đơn chờ hái", value: pending.c, href: "/farmer/don-hang" },
      { icon: "eco", label: "Sản phẩm", value: prods.c, href: "/farmer/san-pham" },
      { icon: "event_repeat", label: "Khách đăng ký", value: subs.c, href: "/farmer/dang-ky" },
    ];
    menuItems = [
      { href: "/farmer", icon: "dashboard", label: "Tổng quan vườn", desc: "Số liệu và đơn gần đây" },
      { href: "/farmer/don-hang", icon: "package_2", label: "Đơn hàng", desc: "Thu hoạch, lên xe, đã giao" },
      { href: "/farmer/san-pham", icon: "inventory_2", label: "Sản phẩm & tồn kho", desc: "Bật tắt món còn hàng, đổi giá" },
      { href: "/farmer/nhat-ky", icon: "photo_camera", label: "Đăng nhật ký vườn", desc: "Ảnh, video từ vườn hôm nay" },
      { href: "/farmer/dang-ky", icon: "event_repeat", label: "Khách đăng ký", desc: "Gói giao định kỳ từ vườn bạn" },
      ...(myFarm ? [{ href: `/farms/${myFarm.slug}`, icon: "storefront", label: "Xem trang vườn của tôi", desc: "Như khách hàng nhìn thấy" }] : []),
    ];
  } else {
    const [[o], [s], [g]] = await Promise.all([
      db.select({ c: count() }).from(orders).where(eq(orders.user_id, user.id)),
      db.select({ c: count() }).from(subscriptions).where(and(eq(subscriptions.user_id, user.id), eq(subscriptions.active, true))),
      db.select({ c: count() }).from(group_order_members).where(eq(group_order_members.user_id, user.id)),
    ]);
    stats = [
      { icon: "package_2", label: "Đơn hàng", value: o.c, href: "/don-hang" },
      { icon: "event_repeat", label: "Gói đang chạy", value: s.c, href: "/dang-ky" },
      { icon: "groups", label: "Nhóm gom đơn", value: g.c, href: "/gom-don" },
    ];
    menuItems = [
      { href: "/don-hang", icon: "package_2", label: "Đơn hàng của tôi", desc: "Theo dõi hành trình rau" },
      { href: "/dang-ky", icon: "event_repeat", label: "Gói đăng ký", desc: "Giao định kỳ tuần / tháng" },
      { href: "/gom-don", icon: "groups", label: "Gom đơn chung", desc: "Mua chung, chia ship" },
    ];
  }

  const isFarmer = user.role === "farmer";

  return (
    <div className="max-w-md mx-auto flex flex-col gap-5">
      <div className="anim-in-scale" style={{ background: isFarmer ? "linear-gradient(135deg, var(--md-tertiary-container), var(--md-primary-container))" : "linear-gradient(135deg, var(--md-primary-container), var(--md-tertiary-container))", borderRadius: "var(--shape-xl-inc)", padding: "28px 24px", display: "flex", alignItems: "center", gap: 18 }}>
        <div className="m3-avatar xl" style={{ background: isFarmer ? "var(--md-tertiary)" : "var(--md-primary)", color: isFarmer ? "var(--md-on-tertiary)" : "var(--md-on-primary)" }}>{user.name?.trim()?.[0]?.toUpperCase() ?? "?"}</div>
        <div style={{ minWidth: 0 }}>
          <p className="headline-sm" style={{ color: "var(--md-on-primary-container)" }}>{user.name}</p>
          <p className="body-sm" style={{ color: "var(--md-on-primary-container)", opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle ?? user.email}</p>
          <span className="m3-chip sm round" style={{ marginTop: 8, background: "var(--md-surface-container-lowest)", boxShadow: "none" }}>
            <Icon name={isFarmer ? "agriculture" : "shopping_basket"} size={16} filled />
            {isFarmer ? "Nhà vườn" : "Khách hàng"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 stagger">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="m3-card-filled lift" style={{ padding: "14px 12px", textAlign: "center", textDecoration: "none", borderRadius: "var(--shape-lg-inc)" }}>
            <Icon name={s.icon} className="text-primary" />
            <p className="headline-sm text-on-surface tabular" style={{ marginTop: 4 }}>{s.value}</p>
            <p className="body-sm text-on-surface-variant">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="m3-list-group stagger">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} className="m3-list-item">
            <span className="m3-list-leading"><Icon name={item.icon} /></span>
            <span>
              <span style={{ display: "block" }}>{item.label}</span>
              <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{item.desc}</span>
            </span>
            <span className="m3-list-trailing"><Icon name="chevron_right" /></span>
          </Link>
        ))}
      </div>

      <div className="anim-in delay-4" style={{ display: "flex", justifyContent: "center" }}>
        <SignOutButton />
      </div>
    </div>
  );
}
