import { Icon } from "@/components/ui/Icon";
import { productBackground } from "@/lib/product-image";
import { CATEGORY_ICONS } from "@/lib/format";

export function ProductThumb({ image_url, category, name, size = 72, radius = "var(--shape-md)" }: { image_url?: string | null; category: string; name: string; size?: number; radius?: string }) {
  return (
    <span className="m3-media-wrap" style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, display: "grid", placeItems: "center", background: productBackground(image_url, category), color: "#1B6B3A" }} role="img" aria-label={name}>
      {!image_url && <Icon name={CATEGORY_ICONS[category] ?? "eco"} size={Math.round(size * 0.42)} filled />}
    </span>
  );
}
