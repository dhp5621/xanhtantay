"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { GrowingTree } from "./GrowingTree";
import type { Level } from "@/lib/commerce";

const PER_PAGE = 4;

/** Levels shown four at a time; swipe on phones, prev/next buttons everywhere. Cards are never cropped. */
export function LevelPager({ levels, points, currentIndex }: { levels: Level[]; points: number; currentIndex: number }) {
  const pages: Level[][] = [];
  for (let i = 0; i < levels.length; i += PER_PAGE) pages.push(levels.slice(i, i + PER_PAGE));
  const [page, setPage] = useState(Math.floor(currentIndex / PER_PAGE));
  const trackRef = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);

  const go = (p: number) => {
    const next = Math.max(0, Math.min(pages.length - 1, p));
    setPage(next);
    const t = trackRef.current;
    if (t) { programmatic.current = true; t.scrollTo({ left: next * t.clientWidth, behavior: "smooth" }); setTimeout(() => { programmatic.current = false; }, 500); }
  };

  // Start on the page holding the current level, and keep `page` in sync with swipes.
  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    t.scrollTo({ left: page * t.clientWidth, behavior: "auto" });
    const onScroll = () => { if (programmatic.current) return; setPage(Math.round(t.scrollLeft / t.clientWidth)); };
    t.addEventListener("scroll", onScroll, { passive: true });
    return () => t.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="m3-pager">
      <div className="m3-pager-head">
        <p className="body-sm text-on-surface-variant">Hạng {page * PER_PAGE + 1}–{Math.min(levels.length, (page + 1) * PER_PAGE)} / {levels.length}</p>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button className="m3-icon-btn tonal" onClick={() => go(page - 1)} disabled={page === 0} aria-label="Trang trước"><Icon name="chevron_left" /></button>
          <div className="m3-pager-dots" aria-hidden>
            {pages.map((_, i) => <button key={i} className={`m3-pager-dot ${i === page ? "active" : ""}`} onClick={() => go(i)} tabIndex={-1} />)}
          </div>
          <button className="m3-icon-btn tonal" onClick={() => go(page + 1)} disabled={page === pages.length - 1} aria-label="Trang sau"><Icon name="chevron_right" /></button>
        </div>
      </div>

      <div ref={trackRef} className="m3-pager-track" aria-live="polite">
        {pages.map((pg, pi) => (
          <div key={pi} className="m3-pager-page">
            {pg.map((lv, j) => {
              const idx = pi * PER_PAGE + j;
              const reached = points >= lv.min;
              const current = idx === currentIndex;
              return (
                <div key={lv.name} className="m3-card-elevated m3-level-card" style={{ opacity: reached ? 1 : 0.62, background: current ? "var(--md-primary-container)" : undefined, color: current ? "var(--md-on-primary-container)" : undefined }}>
                  <div className="m3-level-art"><GrowingTree stage={lv.stage} size={120} /></div>
                  <p className="label-sm" style={{ opacity: 0.7, letterSpacing: 0.4 }}>HẠNG {idx + 1}</p>
                  <p className="title-md" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name={lv.icon} size={18} filled /> {lv.name}</p>
                  <p className="body-sm" style={{ opacity: 0.8 }}>{lv.min === 0 ? "Bắt đầu" : `từ ${lv.min.toLocaleString("vi-VN")} điểm`} · {lv.desc}</p>
                  {current ? (
                    <span className="m3-chip sm round" style={{ marginTop: 8, background: "var(--md-surface-container-lowest)", boxShadow: "none", alignSelf: "flex-start" }}><Icon name="my_location" size={14} /> Bạn đang ở đây</span>
                  ) : reached ? (
                    <span className="m3-chip sm round m3-chip-primary" style={{ marginTop: 8, alignSelf: "flex-start" }}><Icon name="check" size={14} /> Đã đạt</span>
                  ) : (
                    <span className="body-sm text-on-surface-variant" style={{ marginTop: 8 }}>còn {(lv.min - points).toLocaleString("vi-VN")} điểm</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
