"use client";

import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { CATEGORY_TINT } from "@/lib/product-image";
import { CATEGORY_ICONS } from "@/lib/format";

export function ProductThumb({ image_url, category, name, size = 72, radius = "var(--shape-md)" }: { image_url?: string | null; category: string; name: string; size?: number; radius?: string }) {
  return (
    <span style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, display: "grid", placeItems: "center", overflow: "hidden", background: CATEGORY_TINT[category] ?? CATEGORY_TINT.rau_la, color: "#1B6B3A" }} role="img" aria-label={name}>
      {image_url ? <SmartImage src={image_url} alt={name} /> : <Icon name={CATEGORY_ICONS[category] ?? "eco"} size={Math.round(size * 0.42)} filled />}
    </span>
  );
}
