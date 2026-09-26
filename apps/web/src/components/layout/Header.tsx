"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "./ThemeProvider";
import { usePathname } from "next/navigation";

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();

  const isFarmer = (session?.user as { role?: string })?.role === "farmer";

  const navLinks = isFarmer
    ? [
        { href: "/farmer", label: "Tổng quan" },
        { href: "/farmer/don-hang", label: "Đơn hàng" },
        { href: "/farmer/san-pham", label: "Sản phẩm" },
        { href: "/farmer/nhat-ky", label: "Nhật ký" },
      ]
    : [
        { href: "/", label: "Trang chủ" },
        { href: "/farms", label: "Vườn rau" },
        { href: "/gom-don", label: "Gom đơn" },
        { href: "/cong-thuc", label: "Công thức" },
      ];

  return (
    <header
      style={{
        background: "var(--md-surface-container)",
        borderBottom: "1px solid var(--md-outline-variant)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-4 h-14">
        {/* Logo */}
        <Link
          href={isFarmer ? "/farmer" : "/"}
          className="flex items-center gap-2 mr-4"
          style={{ textDecoration: "none" }}
        >
          <span style={{ fontSize: 20 }}>🌿</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: "var(--md-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Xanh Tận Tay
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--md-primary)" : "var(--md-on-surface-variant)",
                  background: active ? "var(--md-primary-container)" : "transparent",
                  textDecoration: "none",
                  transition: "background .15s, color .15s",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={() => {
              if (theme === "system") setTheme("dark");
              else if (theme === "dark") setTheme("light");
              else setTheme("system");
            }}
            title="Chế độ hiển thị"
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-full)",
              border: "none",
              background: "var(--md-surface-container-high)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color: "var(--md-on-surface-variant)",
            }}
          >
            {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🖥️"}
          </button>

          {session ? (
            <>
              <Link
                href="/tai-khoan"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-full)",
                  background: "var(--md-primary-container)",
                  color: "var(--md-on-primary-container)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {session.user?.name?.[0]?.toUpperCase() ?? "?"}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/dang-nhap" })}
                className="m3-outlined-button"
                style={{ padding: "6px 14px", fontSize: 13 }}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link href="/dang-nhap" className="m3-filled-button" style={{ padding: "6px 16px", fontSize: 13, textDecoration: "none" }}>
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
