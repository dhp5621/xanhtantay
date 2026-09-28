import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { formatVND } from "@/lib/format";
import { formatKg } from "@/lib/commerce";
import type { MixView } from "@/lib/queries";

/** One mix of vegetables, offered in sizes the way clothing is: pick the mix, then S, M or L. */
export function MixCard({ mix }: { mix: MixView }) {
  const main = mix.sizes.find((b) => b.size === "M") ?? mix.sizes[0];
  const provinces = Array.from(new Set(mix.items.flatMap((i) => i.farms.map((f) => f.province))));
  return (
    <article className="m3-card-elevated" style={{ borderRadius: "var(--shape-xl)", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Link href={`/hop-rau/${main.slug}`} className="m3-card-action" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        <div className="m3-media-wrap" style={{ height: 170, position: "relative", background: "var(--md-primary-container)" }}>
          {mix.image_url && <SmartImage src={mix.image_url} alt={mix.name} className="m3-card-media" style={{ position: "absolute", inset: 0 }} />}
          <span className="m3-chip sm round" style={{ position: "absolute", right: 12, top: 12, background: "rgba(0,0,0,.55)", color: "#fff", boxShadow: "none" }}>{mix.season}</span>
        </div>
        <div style={{ padding: "16px 18px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          <p className="title-lg text-on-surface">{mix.name}</p>
          <p className="body-sm text-on-surface-variant" style={{ display: "inline-flex", gap: 10, flexWrap: "wrap" }}>
            <span><Icon name="calendar_month" size={14} /> {main.days} ngày · {main.days * 2} bữa</span>
            <span><Icon name="eco" size={14} /> {mix.items.length} loại</span>
            <span><Icon name="location_on" size={14} /> {provinces.join(" · ")}</span>
          </p>
          <p className="body-sm text-on-surface-variant">{mix.items.map((i) => i.name).join(" · ")}</p>
        </div>
      </Link>
      <div className="m3-size-row" style={{ padding: "14px 18px 18px", marginTop: "auto" }}>
        {mix.sizes.map((b) => (
          <Link key={b.id} href={`/hop-rau/${b.slug}`} className="m3-size" aria-label={`${mix.name}, size ${b.size}, ${formatKg(b.weight_kg)}, ${formatVND(b.price)}`}>
            <span className="m3-size-letter">{b.size}</span>
            <span className="body-sm" style={{ fontWeight: 500 }}>{formatKg(b.weight_kg)}</span>
            <span className="body-sm text-on-surface-variant">{b.servings} người</span>
            <span className="m3-size-price tabular text-primary">{formatVND(b.price)}</span>
          </Link>
        ))}
      </div>
    </article>
  );
}
