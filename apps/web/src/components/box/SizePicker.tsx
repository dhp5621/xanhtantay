import Link from "next/link";
import { formatVND } from "@/lib/format";
import { formatKg } from "@/lib/commerce";

/** Switch between the sizes of one mix. Each size is its own box, so these are plain links. */
export function SizePicker({ sizes, current }: { sizes: { id: string; slug: string; size: string; weight_kg: number; servings: number; price: number }[]; current: string }) {
  if (sizes.length < 2) return null;
  return (
    <div className="m3-card-filled" style={{ borderRadius: "var(--shape-xl)", padding: 16 }}>
      <p className="m3-label" style={{ marginBottom: 10 }}>Chọn size</p>
      <div className="m3-size-row">
        {sizes.map((b) => (
          <Link key={b.id} href={`/hop-rau/${b.slug}`} scroll={false} replace className={`m3-size ${b.id === current ? "selected" : ""}`} aria-current={b.id === current ? "true" : undefined}>
            <span className="m3-size-letter">{b.size}</span>
            <span className="body-sm" style={{ fontWeight: 500 }}>{formatKg(b.weight_kg)}</span>
            <span className="body-sm text-on-surface-variant">{b.servings} người</span>
            <span className="m3-size-price tabular">{formatVND(b.price)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
