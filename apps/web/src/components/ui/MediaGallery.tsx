"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { MediaLightbox, type LightboxItem } from "./MediaLightbox";
import { SmartImage } from "./SmartImage";
import { SmartVideo } from "./SmartVideo";

const isVideoUrl = (u: string) => /\.(mp4|webm|mov)(\?|$)/i.test(u);

/** Thumbnail strip for diary entries; tapping opens the lightbox. */
export function MediaGallery({ urls, size = 96, caption, layout = "strip", tag }: { urls: string[]; size?: number; caption?: string; layout?: "strip" | "post"; tag?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const items: LightboxItem[] = urls.map((url) => ({ url, kind: isVideoUrl(url) ? "video" : "image", caption }));
  if (!items.length) return null;

  if (layout === "post") {
    const cols = items.length === 1 ? 1 : items.length === 2 || items.length === 4 ? 2 : 3;
    return (
      <>
        <div className="m3-post-media" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {items.map((it, k) => (
            <button key={it.url} type="button" onClick={() => setOpen(k)} className="m3-thumb" style={{ aspectRatio: items.length === 1 ? "4 / 3" : "1 / 1", borderRadius: "var(--shape-lg)", position: "relative", border: "none", padding: 0, cursor: "zoom-in", background: "var(--md-surface-container-high)", overflow: "hidden", width: "100%" }} aria-label={it.kind === "video" ? "Xem video" : "Xem ảnh"}>
              {it.kind === "video" ? <SmartVideo src={it.url} /> : <SmartImage src={it.url} />}
              {it.kind === "video" && <span className="m3-thumb-play"><Icon name="play_arrow" size={36} filled /></span>}
            </button>
          ))}
        </div>
        {open !== null && <MediaLightbox items={items} index={open} onClose={() => setOpen(null)} tag={tag} />}
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
        {items.slice(0, 4).map((it, k) => (
          <button key={it.url} type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(k); }} className="m3-media-wrap m3-thumb" style={{ width: size, height: size, borderRadius: "var(--shape-md)", position: "relative", border: "none", padding: 0, cursor: "zoom-in", background: "var(--md-surface-container-high)", overflow: "hidden" }} aria-label={it.kind === "video" ? "Xem video" : "Xem ảnh"}>
            {it.kind === "video" ? <SmartVideo src={it.url} /> : <SmartImage src={it.url} />}
            {it.kind === "video" && <span className="m3-thumb-play"><Icon name="play_arrow" size={22} filled /></span>}
            {k === 3 && items.length > 4 && <span className="m3-thumb-more">+{items.length - 4}</span>}
          </button>
        ))}
      </div>
      {open !== null && <MediaLightbox items={items} index={open} onClose={() => setOpen(null)} tag={tag} />}
    </>
  );
}
