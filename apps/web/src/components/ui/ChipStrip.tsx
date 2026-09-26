"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

/** Horizontal chip row: swipe on touch, prev/next buttons on pointer devices, no fade/depth effects. */
export function ChipStrip({ children, ariaLabel }: { children: React.ReactNode; ariaLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  const update = () => { const el = ref.current; if (!el) return; setCanL(el.scrollLeft > 2); setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 2); };
  useEffect(() => { const el = ref.current; if (!el) return; update(); el.addEventListener("scroll", update, { passive: true }); const ro = new ResizeObserver(update); ro.observe(el); return () => { el.removeEventListener("scroll", update); ro.disconnect(); }; }, []);
  const by = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="m3-chip-strip-wrap">
      <button type="button" className={`m3-icon-btn tonal m3-chip-strip-btn left ${canL ? "show" : ""}`} onClick={() => by(-1)} aria-label="Cuộn trái" tabIndex={canL ? 0 : -1}><Icon name="chevron_left" /></button>
      <div ref={ref} className="m3-chip-scroll" role="tablist" aria-label={ariaLabel}>{children}</div>
      <button type="button" className={`m3-icon-btn tonal m3-chip-strip-btn right ${canR ? "show" : ""}`} onClick={() => by(1)} aria-label="Cuộn phải" tabIndex={canR ? 0 : -1}><Icon name="chevron_right" /></button>
    </div>
  );
}
