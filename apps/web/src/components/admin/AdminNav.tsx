"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SECTIONS } from "@/lib/admin-config";

/** M3 navigation rail (desktop) / scrollable tabs (mobile) for the admin area. */
export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/admin/login") return null;

  const items = [{ key: "", label: "Tổng quan", icon: "dashboard" }, ...SECTIONS.map((s) => ({ key: s.key, label: s.label, icon: s.icon }))];

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <nav className="admin-rail" aria-label="Quản trị">
      <Link href="/admin" className="m3-brand" style={{ margin: "8px 0 16px", justifyContent: "center" }} aria-label="Trang quản trị">
        <span className="m3-brand-mark" style={{ background: "var(--md-tertiary)", color: "var(--md-on-tertiary)" }}><Icon name="admin_panel_settings" size={22} filled /></span>
        <span className="admin-rail-label" style={{ fontSize: 15 }}>Quản trị</span>
      </Link>
      <div className="admin-rail-items">
        {items.map((it) => {
          const href = it.key ? `/admin/${it.key}` : "/admin";
          const active = it.key ? pathname.startsWith(href) : pathname === "/admin";
          return (
            <Link key={href} href={href} className={`admin-rail-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} title={it.label}>
              <span className="admin-rail-icon"><Icon name={it.icon} filled={active} /></span>
              <span className="admin-rail-label">{it.label}</span>
            </Link>
          );
        })}
      </div>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        <Link href="/" className="admin-rail-item"><span className="admin-rail-icon"><Icon name="storefront" /></span><span className="admin-rail-label">Xem cửa hàng</span></Link>
        <button onClick={logout} className="admin-rail-item" style={{ border: "none", background: "transparent", cursor: "pointer", font: "inherit" }}>
          <span className="admin-rail-icon"><Icon name="logout" /></span><span className="admin-rail-label">Đăng xuất</span>
        </button>
      </div>
    </nav>
  );
}
