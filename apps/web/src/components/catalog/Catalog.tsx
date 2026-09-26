"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CATEGORY_LABELS, CATEGORY_ICONS, formatVND } from "@/lib/format";
import { ProductThumb } from "./ProductThumb";

export interface CatalogItem { id: string; name: string; unit: string; price_per_unit: number; category: string; in_stock: boolean; stock_qty: number; image_url?: string | null; farm: { id: string; name: string; slug: string; location: string } }

/** Normalise Vietnamese for search: lowercase, strip diacritics. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

/** Group key: product name without brand words so "Cà rốt Đà Lạt" and "Cà rốt" meet. */
const baseName = (n: string) => n.replace(/\s*\((.*?)\)\s*/g, " ").trim();

export function Catalog({ items, initialQuery, initialCategory, initialProduct }: { items: CatalogItem[]; initialQuery: string; initialCategory: string; initialProduct: string }) {
  const [q, setQ] = useState(initialQuery);
  const [cat, setCat] = useState(initialCategory);
  const [product, setProduct] = useState(initialProduct);
  const [onlyStock, setOnlyStock] = useState(true);
  const [sort, setSort] = useState<"name" | "price">("name");

  // Product "aisles": distinct base names, e.g. Cà rốt, Cải xanh, Mồng tơi…
  const aisles = useMemo(() => {
    const m = new Map<string, { n: number; image?: string | null }>();
    for (const it of items) { const k = baseName(it.name); const cur = m.get(k) ?? { n: 0, image: null }; m.set(k, { n: cur.n + 1, image: cur.image ?? it.image_url }); }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], "vi")).map(([name, v]) => ({ name, n: v.n, image: v.image }));
  }, [items]);

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return items
      .filter((it) => (!cat || it.category === cat) && (!product || baseName(it.name) === product) && (!onlyStock || it.in_stock) && (!nq || norm(it.name).includes(nq) || norm(it.farm.name).includes(nq) || norm(it.farm.location).includes(nq)))
      .sort((a, b) => (sort === "price" ? a.price_per_unit - b.price_per_unit : a.name.localeCompare(b.name, "vi")));
  }, [items, q, cat, product, onlyStock, sort]);

  // Group results by base product so the same vegetable from several farms sits together.
  const groups = useMemo(() => {
    const m = new Map<string, CatalogItem[]>();
    for (const it of filtered) { const k = baseName(it.name); m.set(k, [...(m.get(k) ?? []), it]); }
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <div className="flex flex-col gap-5">
      {/* Search + filters */}
      <div className="anim-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ position: "relative" }}>
          <Icon name="search" size={22} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "var(--md-on-surface-variant)" }} />
          <input className="m3-input m3-input-outlined" placeholder="Tìm cà rốt, cải, vườn bác Ba…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 52, height: 56, borderRadius: "var(--shape-full)" }} aria-label="Tìm rau củ" />
          {q && <button className="m3-icon-btn" onClick={() => setQ("")} aria-label="Xoá" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}><Icon name="close" size={20} /></button>}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button className={`m3-chip round ${!cat ? "selected" : ""}`} onClick={() => setCat("")}>Tất cả</button>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <button key={k} className={`m3-chip round ${cat === k ? "selected" : ""}`} onClick={() => setCat(cat === k ? "" : k)}><Icon name={CATEGORY_ICONS[k]} size={18} filled={cat === k} /> {v}</button>
          ))}
          <span style={{ flex: 1 }} />
          <button className={`m3-chip round ${onlyStock ? "selected" : ""}`} onClick={() => setOnlyStock((v) => !v)}><Icon name={onlyStock ? "check" : "inventory_2"} size={16} /> Còn hàng</button>
          <div className="m3-button-group">
            <button className={`m3-seg ${sort === "name" ? "selected" : ""}`} onClick={() => setSort("name")}><Icon name="sort_by_alpha" size={16} /> Tên</button>
            <button className={`m3-seg ${sort === "price" ? "selected" : ""}`} onClick={() => setSort("price")}><Icon name="payments" size={16} /> Giá</button>
          </div>
        </div>
      </div>

      {/* Aisles */}
      <div className="m3-chip-scroll" role="tablist" aria-label="Mặt hàng">
        <button role="tab" aria-selected={!product} className={`m3-chip round ${!product ? "m3-chip-primary" : "m3-chip-surface"}`} style={{ height: 40 }} onClick={() => setProduct("")}><Icon name="apps" size={18} /> Mọi mặt hàng</button>
        {aisles.map((a) => (
          <button key={a.name} role="tab" aria-selected={product === a.name} className={`m3-chip round ${product === a.name ? "m3-chip-primary" : "m3-chip-surface"}`} style={{ height: 40 }} onClick={() => setProduct(product === a.name ? "" : a.name)}>
            {a.image ? <span style={{ width: 22, height: 22, borderRadius: "50%", background: `url(${a.image}) center/cover`, flexShrink: 0, marginLeft: -4 }} /> : <Icon name="eco" size={18} filled={product === a.name} />} {a.name} <span style={{ opacity: 0.6 }}>· {a.n}</span>
          </button>
        ))}
      </div>

      <p className="body-sm text-on-surface-variant">{filtered.length} sản phẩm{groups.length !== filtered.length ? ` · ${groups.length} mặt hàng` : ""}</p>

      {groups.length === 0 ? (
        <div className="m3-empty"><span className="m3-empty-icon"><Icon name="search_off" size={40} /></span><p className="title-lg">Không thấy món nào</p><p className="body-md text-on-surface-variant">Thử từ khác hoặc bỏ bớt bộ lọc.</p></div>
      ) : (
        <div className="flex flex-col gap-6 stagger">
          {groups.map(([name, list]) => {
            const cheapest = Math.min(...list.map((i) => i.price_per_unit));
            return (
              <section key={name}>
                <div className="m3-section-head" style={{ marginBottom: 10 }}>
                  <h2 className="title-lg text-on-surface"><Icon name={CATEGORY_ICONS[list[0].category] ?? "eco"} filled /> {name}</h2>
                  <span className="body-sm text-on-surface-variant">{list.length} vườn · từ {formatVND(cheapest)}/{list[0].unit}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((it) => (
                    <div key={it.id} className="m3-card lift" style={{ padding: "12px 14px 12px 12px", display: "flex", alignItems: "center", gap: 12, borderRadius: "var(--shape-lg-inc)", opacity: it.in_stock ? 1 : 0.6 }}>
                      <ProductThumb image_url={it.image_url} category={it.category} name={it.name} size={76} radius="var(--shape-lg)" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="title-sm text-on-surface" style={{ marginBottom: 2 }}>{it.name}</p>
                        <Link href={`/farms/${it.farm.slug}`} className="body-sm text-primary" style={{ display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", fontWeight: 600 }}><Icon name="potted_plant" size={14} filled /> {it.farm.name}</Link>
                        <p className="label-lg tabular text-on-surface" style={{ marginTop: 2 }}>{formatVND(it.price_per_unit)} <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>/ {it.unit}</span>{it.price_per_unit === cheapest && list.length > 1 && <span className="m3-chip sm round m3-chip-primary" style={{ marginLeft: 6, height: 20, fontSize: 10 }}>Rẻ nhất</span>}</p>
                        {it.in_stock ? <span className="body-sm text-on-surface-variant">Còn {it.stock_qty} {it.unit}</span> : <span className="m3-chip sm m3-chip-error round" style={{ marginTop: 4 }}>Hết hàng</span>}
                      </div>
                      {it.in_stock && <AddToCartButton compact max={it.stock_qty} product={{ id: it.id, name: it.name, unit: it.unit, price_per_unit: it.price_per_unit, farm_id: it.farm.id, farm_name: it.farm.name, farm_slug: it.farm.slug, farm_location: it.farm.location }} />}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
