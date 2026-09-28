"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { SECTIONS } from "@/lib/admin-config";

/** M3 navigation rail (desktop) / scrollable tabs (mobile) for the admin area. */
export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);

  // On phones the rail is a horizontal strip: scroll the active item into view.
  const firstRun = useRef(true);
  useEffect(() => {
    const c = listRef.current;
    const el = c?.querySelector<HTMLElement>(".admin-rail-item.active");
    if (!c || !el || c.scrollWidth <= c.clientWidth) return;
    // Scroll the strip itself (not the page) so the active tab is centred.
    // Instant on first paint (smooth scrolling does not run while the tab is hidden), smooth afterwards.
    c.scrollTo({ left: el.offsetLeft - (c.clientWidth - el.offsetWidth) / 2, behavior: firstRun.current ? "auto" : "smooth" });
    firstRun.current = false;
  }, [pathname]);

  if (pathname === "/admin/login") return null;

  const items = [{ key: "", label: "Bộ não", icon: "psychology" }, ...SECTIONS.map((s) => ({ key: s.key, label: s.label, icon: s.icon }))];

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
      <div className="admin-rail-items" ref={listRef}>
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
      <div className="admin-rail-end">
        <Link href="/" className="admin-rail-item" title="Xem cửa hàng"><span className="admin-rail-icon"><Icon name="storefront" /></span><span className="admin-rail-label">Xem cửa hàng</span></Link>
        <button onClick={logout} className="admin-rail-item" title="Đăng xuất" style={{ border: "none", background: "transparent", cursor: "pointer", font: "inherit" }}>
          <span className="admin-rail-icon"><Icon name="logout" /></span><span className="admin-rail-label">Đăng xuất</span>
        </button>
      </div>
    </nav>
  );
}
