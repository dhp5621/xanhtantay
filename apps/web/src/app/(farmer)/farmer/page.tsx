export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders, farms, products } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import Link from "next/link";

export default async function FarmerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/dang-nhap");

  const user = session.user as { id: string; role?: string };
  if (user.role !== "farmer") redirect("/");

  const [myFarm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));

  let stats = { pending: 0, total: 0, products: 0 };
  if (myFarm) {
    const [pending] = await db
      .select({ c: count() })
      .from(orders)
      .where(and(eq(orders.farm_id, myFarm.id), eq(orders.status, "harvesting")));
    const [total] = await db
      .select({ c: count() })
      .from(orders)
      .where(eq(orders.farm_id, myFarm.id));
    const [prods] = await db
      .select({ c: count() })
      .from(products)
      .where(eq(products.farm_id, myFarm.id));
    stats = { pending: pending.c, total: total.c, products: prods.c };
  }

  const tiles = [
    { icon: "📋", label: "Đơn chờ xử lý", value: stats.pending, href: "/farmer/don-hang", color: "var(--md-tertiary-container)" },
    { icon: "📦", label: "Tổng đơn hàng", value: stats.total, href: "/farmer/don-hang", color: "var(--md-secondary-container)" },
    { icon: "🌿", label: "Sản phẩm", value: stats.products, href: "/farmer/san-pham", color: "var(--md-primary-container)" },
  ];

  const quickLinks = [
    { href: "/farmer/nhat-ky", icon: "📸", label: "Đăng nhật ký hôm nay" },
    { href: "/farmer/san-pham", icon: "🥬", label: "Cập nhật tồn kho" },
    { href: "/farmer/don-hang", icon: "📦", label: "Xem đơn hàng mới" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--md-on-surface)", marginBottom: 2 }}>
          Chào buổi sáng, {session.user?.name?.split(" ")[0]}! 👋
        </h1>
        {myFarm && (
          <p style={{ fontSize: 14, color: "var(--md-on-surface-variant)" }}>
            {myFarm.name} • {myFarm.location}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <Link key={tile.href + tile.label} href={tile.href} style={{ textDecoration: "none" }}>
            <div
              style={{
                background: tile.color,
                borderRadius: "var(--radius-xl)",
                padding: "20px 22px",
                cursor: "pointer",
              }}
            >
              <p style={{ fontSize: 24, marginBottom: 4 }}>{tile.icon}</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: "var(--md-on-surface)", fontVariantNumeric: "tabular-nums" }}>
                {tile.value}
              </p>
              <p style={{ fontSize: 13, color: "var(--md-on-surface-variant)", marginTop: 2 }}>
                {tile.label}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--md-on-surface)", marginBottom: 12 }}>
          Thao tác nhanh
        </h2>
        <div className="flex flex-col gap-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                background: "var(--md-surface-container-low)",
                borderRadius: "var(--radius-lg)",
                textDecoration: "none",
                color: "var(--md-on-surface)",
                fontWeight: 500,
                fontSize: 15,
              }}
            >
              <span style={{ fontSize: 20 }}>{link.icon}</span>
              {link.label}
              <span style={{ marginLeft: "auto", color: "var(--md-on-surface-variant)" }}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
