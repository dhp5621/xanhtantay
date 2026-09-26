import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TaiKhoanPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/dang-nhap");

  const user = session.user as { name?: string; email?: string; role?: string; id?: string };

  const menuItems = [
    { href: "/don-hang", icon: "📦", label: "Đơn hàng của tôi" },
    { href: "/dang-ky", icon: "🗓️", label: "Gói đăng ký" },
    { href: "/gom-don", icon: "👥", label: "Gom đơn chung" },
  ];

  return (
    <div className="max-w-md mx-auto">
      {/* Profile header */}
      <div
        style={{
          background: "var(--md-surface-container)",
          borderRadius: "var(--radius-xl)",
          padding: "28px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "var(--md-primary-container)",
            color: "var(--md-on-primary-container)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          {user.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 17, color: "var(--md-on-surface)" }}>
            {user.name}
          </p>
          <p style={{ fontSize: 13, color: "var(--md-on-surface-variant)" }}>{user.email}</p>
          <span
            className="m3-chip m3-chip-primary"
            style={{ marginTop: 6, fontSize: 11 }}
          >
            {user.role === "farmer" ? "🌾 Nông dân" : "🛒 Khách hàng"}
          </span>
        </div>
      </div>

      {/* Menu */}
      <div className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
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
              transition: "background .15s",
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
            <span style={{ marginLeft: "auto", color: "var(--md-on-surface-variant)", fontSize: 18 }}>
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
