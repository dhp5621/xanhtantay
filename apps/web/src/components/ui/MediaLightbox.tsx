"use client";

import { useEffect, useState } from "react";
import { Portal } from "./Portal";
import { Icon } from "./Icon";
import { SmartImage } from "./SmartImage";
import { SmartVideo } from "./SmartVideo";

export interface LightboxItem { url: string; kind: "image" | "video"; caption?: string }

/** Full-screen media viewer: arrows / swipe / keyboard between items, video with controls. */
export function MediaLightbox({
  items,
  index,
  onClose,
  onDelete,
}: {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onDelete?: (index: number) => void;
}) {
  const [i, setI] = useState(index);
  const [closing, setClosing] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const item = items[i];

  const close = () => { setClosing(true); setTimeout(onClose, 220); };
  const prev = () => setI((x) => (x - 1 + items.length) % items.length);
  const next = () => setI((x) => (x + 1) % items.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  if (!item) return null;

  return (
    <Portal>
      <div className={`m3-scrim ${closing ? "closing" : ""}`} style={{ background: "rgba(0,0,0,.92)", zIndex: 200 }} onClick={close} aria-hidden />
      <section
        className={`m3-lightbox ${closing ? "closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Xem ảnh / video"
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const dx = e.changedTouches[0].clientX - touchX;
          if (Math.abs(dx) > 48) (dx > 0 ? prev : next)();
          setTouchX(null);
        }}
      >
        <div className="m3-lightbox-top">
          <button className="m3-icon-btn" onClick={close} aria-label="Đóng" style={{ color: "#fff" }}><Icon name="close" /></button>
          <span className="label-lg" style={{ color: "#fff", flex: 1, textAlign: "center" }}>{items.length > 1 ? `${i + 1} / ${items.length}` : ""}</span>
          {onDelete ? (
            <button className="m3-icon-btn" onClick={() => { onDelete(i); if (items.length <= 1) close(); else setI((x) => Math.min(x, items.length - 2)); }} aria-label="Xoá tệp này" style={{ color: "var(--md-error)" }}><Icon name="delete" /></button>
          ) : <span style={{ width: 40 }} />}
        </div>

        <div className="m3-lightbox-stage" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div key={item.url} className="m3-lightbox-media anim-in-scale" style={{ width: "min(100%, 1100px)", height: "100%", display: "grid", placeItems: "center" }}>
            {item.kind === "video" ? (
              <SmartVideo src={item.url} controls autoPlay objectFit="contain" style={{ maxHeight: "100%", background: "transparent", borderRadius: "var(--shape-md)" }} />
            ) : (
              <SmartImage src={item.url} alt={item.caption ?? ""} objectFit="contain" priority style={{ maxHeight: "100%", background: "transparent", borderRadius: "var(--shape-md)" }} />
            )}
          </div>
          {items.length > 1 && (
            <>
              <button className="m3-icon-btn m3-lightbox-nav" style={{ left: 8 }} onClick={prev} aria-label="Trước"><Icon name="chevron_left" size={28} /></button>
              <button className="m3-icon-btn m3-lightbox-nav" style={{ right: 8 }} onClick={next} aria-label="Sau"><Icon name="chevron_right" size={28} /></button>
            </>
          )}
        </div>

        {(item.caption || items.length > 1) && (
          <div className="m3-lightbox-bottom">
            {item.caption && <p className="body-sm" style={{ color: "rgba(255,255,255,.8)", textAlign: "center", marginBottom: items.length > 1 ? 10 : 0 }}>{item.caption}</p>}
            {items.length > 1 && (
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                {items.map((it, k) => (
                  <button key={it.url} onClick={() => setI(k)} aria-label={`Mục ${k + 1}`} className="m3-lightbox-dot" style={{ width: k === i ? 24 : 8, background: k === i ? "var(--md-primary)" : "rgba(255,255,255,.4)" }} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </Portal>
  );
}
