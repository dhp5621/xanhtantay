"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { memo } from "react";
import { Icon } from "@/components/ui/Icon";
import { CUSTOMER_MOBILE_NAV, FARMER_MOBILE_NAV, isActive } from "./nav-config";

const HIDDEN_ON = ["/dang-nhap"];

/** Material 3 navigation bar, shown on phones only (CSS hides it at ≥768px). */
function NavBarImpl() {
  const pathname = usePathname();
  const { data: session } = useSession();
  if (HIDDEN_ON.includes(pathname) || pathname.startsWith("/admin") || !session) return null;

  const isFarmer = (session?.user as { role?: string } | undefined)?.role === "farmer";
  const items = isFarmer ? FARMER_MOBILE_NAV : CUSTOMER_MOBILE_NAV;

  return (
    <nav className="m3-nav-bar" aria-label="Điều hướng">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`m3-nav-bar-item ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
            prefetch
          >
            <span className="m3-nav-bar-icon">
              <Icon name={item.icon} filled={active} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export const NavBar = memo(NavBarImpl);
