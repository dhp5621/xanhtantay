"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { MediaLightbox, type LightboxItem } from "./MediaLightbox";

const isVideoUrl = (u: string) => /\.(mp4|webm|mov)(\?|$)/i.test(u);

/** Thumbnail strip for diary entries; tapping opens the lightbox. */
export function MediaGallery({ urls, size = 96, caption }: { urls: string[]; size?: number; caption?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const items: LightboxItem[] = urls.map((url) => ({ url, kind: isVideoUrl(url) ? "video" : "image", caption }));
  if (!items.length) return null;

  return (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
        {items.slice(0, 4).map((it, k) => (
          <button key={it.url} type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(k); }} className="m3-media-wrap m3-thumb" style={{ width: size, height: size, borderRadius: "var(--shape-md)", position: "relative", border: "none", padding: 0, cursor: "zoom-in", background: "#000" }} aria-label={it.kind === "video" ? "Xem video" : "Xem ảnh"}>
            {it.kind === "video" ? (
              <video src={it.url} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div className="m3-card-media" style={{ width: "100%", height: "100%", backgroundImage: `url(${it.url})` }} />
            )}
            {it.kind === "video" && <span className="m3-thumb-play"><Icon name="play_arrow" size={22} filled /></span>}
            {k === 3 && items.length > 4 && <span className="m3-thumb-more">+{items.length - 4}</span>}
          </button>
        ))}
      </div>
      {open !== null && <MediaLightbox items={items} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}
