import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { CATEGORY_ICONS } from "@/lib/format";
import { formatKg } from "@/lib/commerce";

export interface ContentLine { name: string; image_url: string | null; quantity_kg: number; category?: string; farms: { name: string; slug: string; location: string; farmer?: string | null }[] }

/** What is inside a box and which farms each vegetable comes from. */
export function BoxContents({ items, title = "Trong hộp có gì", hint }: { items: ContentLine[]; title?: string; hint?: string }) {
  return (
    <section>
      <div className="m3-section-head">
        <h2 className="headline-sm text-on-surface"><Icon name="inventory_2" filled /> {title}</h2>
        <span className="body-sm text-on-surface-variant">{hint ?? `${items.length} loại · ${formatKg(items.reduce((s, i) => s + i.quantity_kg, 0))}`}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
        {items.map((it) => (
          <div key={it.name} className="m3-card lift" style={{ padding: "12px 14px 12px 12px", display: "flex", gap: 12, alignItems: "center", borderRadius: "var(--shape-lg-inc)" }}>
            <span style={{ width: 68, height: 68, borderRadius: "var(--shape-lg)", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center", background: "var(--md-primary-container)", color: "var(--md-on-primary-container)" }}>
              {it.image_url ? <SmartImage src={it.image_url} alt={it.name} /> : <Icon name={CATEGORY_ICONS[it.category ?? ""] ?? "eco"} size={28} filled />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="title-sm text-on-surface">{it.name} <span className="label-lg text-primary tabular" style={{ marginLeft: 4 }}>{formatKg(it.quantity_kg)}</span></p>
              <p className="body-sm text-on-surface-variant" style={{ marginTop: 2 }}>
                {it.farms.length === 0 ? "Đang chờ phân bổ vườn" : it.farms.map((f, i) => (
                  <span key={f.slug}>{i > 0 && " · "}<Link href={`/farms/${f.slug}`} className="text-primary" style={{ textDecoration: "none", fontWeight: 600 }}>{f.name}</Link> <span>({f.location.split(",").pop()?.trim()})</span></span>
                ))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
