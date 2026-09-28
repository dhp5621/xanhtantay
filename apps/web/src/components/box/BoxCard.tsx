import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { formatVND } from "@/lib/format";
import { SIZE_LABELS, formatKg } from "@/lib/commerce";
import type { BoxView } from "@/lib/queries";

const TONE: Record<string, [string, string]> = { S: ["var(--md-secondary-container)", "var(--md-on-secondary-container)"], M: ["var(--md-primary-container)", "var(--md-on-primary-container)"], L: ["var(--md-tertiary-container)", "var(--md-on-tertiary-container)"] };

export function BoxCard({ box, href }: { box: BoxView; href?: string }) {
  const [bg, fg] = TONE[box.size] ?? TONE.M;
  const provinces = Array.from(new Set(box.items.flatMap((i) => i.farms.map((f) => f.province))));
  return (
    <Link href={href ?? `/hop-rau/${box.slug}`} className="m3-card-elevated m3-card-action" style={{ borderRadius: "var(--shape-xl)", display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="m3-media-wrap" style={{ height: 170, position: "relative", background: bg }}>
        {box.image_url && <SmartImage src={box.image_url} alt={box.name} className="m3-card-media" style={{ position: "absolute", inset: 0 }} />}
        <span className="m3-chip sm round" style={{ position: "absolute", left: 12, top: 12, background: bg, color: fg, boxShadow: "none", fontWeight: 700 }}>{SIZE_LABELS[box.size] ?? box.size} · {formatKg(box.weight_kg)}</span>
        <span className="m3-chip sm round" style={{ position: "absolute", right: 12, top: 12, background: "rgba(0,0,0,.55)", color: "#fff", boxShadow: "none" }}>{box.season}</span>
      </div>
      <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <p className="title-lg text-on-surface">{box.name}</p>
        <p className="body-sm text-on-surface-variant" style={{ display: "inline-flex", gap: 10, flexWrap: "wrap" }}>
          <span><Icon name="group" size={14} /> {box.servings} người</span>
          <span><Icon name="calendar_month" size={14} /> {box.days} ngày · {box.days * 2} bữa</span>
          <span><Icon name="eco" size={14} /> {box.items.length} loại</span>
        </p>
        <p className="body-sm text-on-surface-variant" style={{ flex: 1 }}>{box.items.map((i) => i.name).join(" · ")}</p>
        <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
          <span className="headline-sm text-primary tabular">{formatVND(box.price)}</span>
          <span className="body-sm text-on-surface-variant">{provinces.join(" · ")}</span>
        </div>
      </div>
    </Link>
  );
}
