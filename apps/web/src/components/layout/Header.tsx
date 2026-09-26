"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { Icon } from "@/components/ui/Icon";
import { CUSTOMER_NAV, FARMER_NAV, VISITOR_NAV, isActive } from "./nav-config";
import { useCart } from "@/components/cart/CartProvider";

const HIDDEN_ON = ["/dang-nhap"];

/** Animated pill that slides under the active nav tab. */
function NavTabs({ items, pathname }: { items: typeof CUSTOMER_NAV; pathname: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number; ready: boolean }>({ x: 0, w: 0, ready: false });
  const activeIndex = items.findIndex((i) => isActive(pathname, i));

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>(`[data-nav-index="${activeIndex}"]`);
      if (!el) { setIndicator((s) => ({ ...s, ready: false })); return; }
      setIndicator({ x: el.offsetLeft, w: el.offsetWidth, ready: true });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    // Fonts swapping in changes tab widths; re-measure when they load.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [activeIndex, items]);

  return (
    <nav ref={listRef} className="m3-nav-tabs" aria-label="Điều hướng chính">
      <span
        className={`m3-nav-indicator ${indicator.ready ? "ready" : ""}`}
        style={{ transform: `translateX(${indicator.x}px)`, width: indicator.w }}
        aria-hidden
      />
      {items.map((item, i) => {
        const active = i === activeIndex;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-nav-index={i}
            className={`m3-nav-tab ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
            prefetch
          >
            <Icon name={item.icon} size={20} filled={active} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  const [swap, setSwap] = useState(false);
  const icon = theme === "dark" ? "dark_mode" : theme === "light" ? "light_mode" : "routine";
  const title = theme === "dark" ? "Giao diện tối" : theme === "light" ? "Giao diện sáng" : "Theo hệ thống";

  useEffect(() => {
    setSwap(true);
    const t = setTimeout(() => setSwap(false), 400);
    return () => clearTimeout(t);
  }, [theme]);

  return (
    <button className="m3-icon-btn" onClick={cycleTheme} title={title} aria-label={`Chế độ hiển thị: ${title}`}>
      <span className={`m3-theme-icon ${swap ? "swap" : ""}`}>
        <Icon name={icon} filled={theme !== "system"} />
      </span>
    </button>
  );
}

function CartButton() {
  const { count, open, hydrated } = useCart();
  const [bump, setBump] = useState(false);
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current) { setBump(true); const t = setTimeout(() => setBump(false), 400); prev.current = count; return () => clearTimeout(t); }
    prev.current = count;
  }, [count]);
  return (
    <button className="m3-icon-btn" onClick={open} aria-label={`Giỏ hàng, ${count} món`} style={{ overflow: "visible" }}>
      <span className={bump ? "m3-bump" : ""} style={{ display: "inline-flex", position: "relative" }}>
        <Icon name="shopping_basket" filled={count > 0} />
        {hydrated && count > 0 && <span className="m3-badge">{count > 99 ? "99+" : count}</span>}
      </span>
    </button>
  );
}

function HeaderImpl() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const role = (session?.user as { role?: string } | undefined)?.role;
  const isFarmer = role === "farmer";
  // /tai-khoan is neutral — keep farmer nav so the mode doesn't reset on account/settings pages
  const inFarmerArea = pathname.startsWith("/farmer") || pathname === "/tai-khoan";
  const items = !session ? VISITOR_NAV : isFarmer ? FARMER_NAV : CUSTOMER_NAV;

  // Scroll elevation via IntersectionObserver instead of a scroll listener,
  // so scrolling never triggers React re-renders.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // The mobile navigation bar only exists for signed-in users.
    const show = !HIDDEN_ON.includes(pathname) && !!session;
    document.body.classList.toggle("has-nav-bar", show);
  }, [pathname, session]);

  if (HIDDEN_ON.includes(pathname)) return null;

  const initial = session?.user?.name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <div ref={sentinelRef} aria-hidden style={{ position: "absolute", top: 0, height: 1, width: 1, pointerEvents: "none" }} />
      <header className={`m3-top-bar ${scrolled ? "scrolled" : ""}`}>
        <div className="m3-top-bar-inner">
          <Link href={isFarmer ? "/farmer" : "/"} className="m3-brand" aria-label="Xanh Tận Tay, về trang chủ">
            <span className="m3-brand-mark"><Icon name="eco" size={22} filled /></span>
            <span className="hidden sm:inline">Xanh Tận Tay</span>
          </Link>

          <NavTabs items={items} pathname={pathname} />

          <div className="m3-top-bar-actions">
            {isFarmer && (
              <span className="hidden sm:inline-flex">
                <Link
                  href={inFarmerArea ? "/" : "/farmer"}
                  className="m3-btn m3-btn-tonal m3-btn-sm"
                  title={inFarmerArea ? "Xem như khách hàng" : "Về trang quản lý vườn"}
                >
                  <Icon name={inFarmerArea ? "storefront" : "agriculture"} size={18} />
                  <span>{inFarmerArea ? "Cửa hàng" : "Vườn của tôi"}</span>
                </Link>
              </span>
            )}
            {!isFarmer && session && <CartButton />}
            <ThemeToggle />
            {session ? (
              <>
                <Link href="/tai-khoan" className="m3-avatar sm" title={session.user?.name ?? "Tài khoản"} aria-label="Tài khoản của tôi">
                  {initial}
                </Link>
                <span className="hidden md:inline-flex">
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="m3-icon-btn"
                    title="Đăng xuất"
                    aria-label="Đăng xuất"
                  >
                    <Icon name="logout" />
                  </button>
                </span>
              </>
            ) : (
              <Link href="/dang-nhap" className="m3-btn m3-btn-filled m3-btn-sm" style={{ marginLeft: 4 }}>
                <Icon name="login" size={18} />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export const Header = memo(HeaderImpl);
