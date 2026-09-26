"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { MediaLightbox } from "@/components/ui/MediaLightbox";
import { CATEGORY_TINT } from "@/lib/product-image";
import { CATEGORY_ICONS } from "@/lib/format";

export function ProductThumb({ image_url, category, name, size = 72, radius = "var(--shape-md)", zoom = false, caption, tag }: { image_url?: string | null; category: string; name: string; size?: number; radius?: string; zoom?: boolean; caption?: string; tag?: string }) {
  const [open, setOpen] = useState(false);
  const inner = image_url ? <SmartImage src={image_url} alt={name} /> : <Icon name={CATEGORY_ICONS[category] ?? "eco"} size={Math.round(size * 0.42)} filled />;
  const style = { width: size, height: size, borderRadius: radius, flexShrink: 0, display: "grid", placeItems: "center", overflow: "hidden", background: CATEGORY_TINT[category] ?? CATEGORY_TINT.rau_la, color: "#1B6B3A" } as const;
  if (!zoom || !image_url) return <span style={style} role="img" aria-label={name}>{inner}</span>;
  return (
    <>
      <button type="button" className="m3-thumb" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }} style={{ ...style, border: "none", padding: 0, cursor: "zoom-in", position: "relative" }} aria-label={`Phóng to ảnh ${name}`}>
        {inner}
        <span style={{ position: "absolute", right: 4, bottom: 4, width: 22, height: 22, borderRadius: 11, background: "rgba(0,0,0,.45)", color: "#fff", display: "grid", placeItems: "center" }}><Icon name="zoom_in" size={14} /></span>
      </button>
      {open && <MediaLightbox items={[{ url: image_url, kind: "image", caption: caption ?? name }]} index={0} onClose={() => setOpen(false)} tag={tag} />}
    </>
  );
}
