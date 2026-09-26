"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";

/**
 * Thin expressive progress line under the top bar while a client navigation is in flight.
 * Starts on internal link clicks / form navigations, ends when the route actually changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);
  const [overlay, setOverlay] = useState(false);

  useEffect(() => { setActive(false); setOverlay(false); }, [pathname, search]);

  // Fast navigations only get the thin line; slower ones (>350 ms) also get the centered spinner.
  useEffect(() => {
    if (!active) { setOverlay(false); return; }
    const t = setTimeout(() => setOverlay(true), 350);
    return () => clearTimeout(t);
  }, [active]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setActive(true);
      // Safety: never stay stuck if navigation was cancelled.
      setTimeout(() => setActive(false), 8000);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <>
      <div className={`m3-nav-progress ${active ? "active" : ""}`} aria-hidden />
      {overlay && <PageLoader fullscreen />}
    </>
  );
}
