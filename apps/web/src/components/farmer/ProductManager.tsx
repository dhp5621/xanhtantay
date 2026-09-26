"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CATEGORY_LABELS, CATEGORY_ICONS, formatVND } from "@/lib/format";

interface Product { id: string; name: string; unit: string; price_per_unit: number; category: string; in_stock: boolean }
const EMPTY = { name: "", unit: "kg", price_per_unit: 10000, category: "rau_la" };

export function ProductManager({ farmId, initial }: { farmId: string; initial: Product[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [closing, setClosing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const { show } = useSnackbar();

  const openNew = () => { setForm(EMPTY); setEditing("new"); };
  const openEdit = (p: Product) => { setForm({ name: p.name, unit: p.unit, price_per_unit: p.price_per_unit, category: p.category }); setEditing(p); };
  const close = () => { setClosing(true); setTimeout(() => { setClosing(false); setEditing(null); }, 250); };

  const toggleStock = async (p: Product) => {
    setBusy(p.id);
    // optimistic
    setItems((xs) => xs.map((x) => (x.id === p.id ? { ...x, in_stock: !p.in_stock } : x)));
    const res = await fetch("/api/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, in_stock: !p.in_stock }) });
    setBusy(null);
    if (!res.ok) {
      setItems((xs) => xs.map((x) => (x.id === p.id ? { ...x, in_stock: p.in_stock } : x)));
      show("Không cập nhật được tồn kho", { kind: "error" });
    } else {
      show(p.in_stock ? `${p.name}: đã báo hết hàng` : `${p.name}: đã mở bán lại`, { kind: "success", duration: 2000 });
      router.refresh();
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("form");
    try {
      const isNew = editing === "new";
      const res = await fetch("/api/products", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? { farm_id: farmId, ...form } : { id: (editing as Product).id, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không lưu được");
      setItems((xs) => (isNew ? [...xs, data] : xs.map((x) => (x.id === data.id ? data : x))));
      show(isNew ? "Đã thêm sản phẩm" : "Đã cập nhật sản phẩm", { kind: "success" });
      close();
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Có lỗi xảy ra", { kind: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="m3-btn m3-btn-filled" onClick={openNew}><Icon name="add" /><span>Thêm sản phẩm</span></button>
      </div>

      {items.length === 0 ? (
        <p className="body-md text-on-surface-variant">Chưa có sản phẩm nào. Thêm món đầu tiên nhé.</p>
      ) : (
        <div className="m3-list-group stagger">
          {items.map((p) => (
            <div key={p.id} className="m3-list-item" style={{ cursor: "default", opacity: p.in_stock ? 1 : 0.6, flexWrap: "wrap" }}>
              <span className="m3-list-leading" style={{ background: p.in_stock ? undefined : "var(--md-surface-container-highest)", color: p.in_stock ? undefined : "var(--md-on-surface-variant)" }}>
                <Icon name={CATEGORY_ICONS[p.category] ?? "eco"} filled={p.in_stock} />
              </span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <p className="title-sm text-on-surface">{p.name} <span className="m3-chip sm" style={{ marginLeft: 6, height: 22, fontSize: 11 }}>{CATEGORY_LABELS[p.category] ?? p.category}</span></p>
                <p className="label-lg text-primary tabular">{formatVND(p.price_per_unit)} <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>/ {p.unit}</span></p>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button className={`m3-btn m3-btn-sm ${p.in_stock ? "m3-btn-tonal-primary" : "m3-btn-error"}`} onClick={() => toggleStock(p)} disabled={busy === p.id} aria-pressed={p.in_stock}>
                  <Icon name={p.in_stock ? "check_circle" : "block"} size={18} filled />
                  <span>{p.in_stock ? "Còn hàng" : "Hết hàng"}</span>
                </button>
                <button className="m3-icon-btn tonal" onClick={() => openEdit(p)} aria-label={`Sửa ${p.name}`}><Icon name="edit" size={20} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <>
          <div className={`m3-scrim ${closing ? "closing" : ""}`} onClick={close} aria-hidden />
          <form className={`m3-dialog ${closing ? "closing" : ""}`} onSubmit={save} role="dialog" aria-modal="true">
            <div className="m3-dialog-icon"><Icon name={editing === "new" ? "add_circle" : "edit"} size={24} filled /></div>
            <div className="m3-dialog-header">
              <h2 className="m3-dialog-title">{editing === "new" ? "Thêm sản phẩm" : "Sửa sản phẩm"}</h2>
            </div>
            <div className="m3-dialog-body">
              <div className="m3-field">
                <label className="m3-field-label" htmlFor="pm-name">Tên sản phẩm</label>
                <input id="pm-name" className="m3-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} placeholder="Ví dụ: Cải ngọt" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="m3-field">
                  <label className="m3-field-label" htmlFor="pm-price">Giá (₫)</label>
                  <input id="pm-price" type="number" min={1000} step={500} className="m3-input" value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: Number(e.target.value) })} required />
                </div>
                <div className="m3-field">
                  <label className="m3-field-label" htmlFor="pm-unit">Đơn vị</label>
                  <select id="pm-unit" className="m3-select" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {["kg", "bó", "củ", "hộp", "trái", "gói"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="m3-field">
                <label className="m3-field-label">Phân loại</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <button key={k} type="button" className={`m3-chip ${form.category === k ? "selected" : ""}`} onClick={() => setForm({ ...form, category: k })}>
                      <Icon name={CATEGORY_ICONS[k]} size={18} filled={form.category === k} /> {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="m3-dialog-actions">
              <button type="button" className="m3-btn m3-btn-text" onClick={close}>Huỷ</button>
              <button type="submit" className="m3-btn m3-btn-filled" disabled={busy === "form"}>
                {busy === "form" ? <span className="m3-loader sm on-primary" /> : <Icon name="save" />}<span>Lưu</span>
              </button>
            </div>
          </form>
        </>
      )}
    </>
  );
}
