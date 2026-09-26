"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CATEGORY_LABELS, CATEGORY_ICONS, formatVND } from "@/lib/format";
import { QtyInput } from "@/components/cart/QtyInput";
import { ProductThumb } from "@/components/catalog/ProductThumb";
import { compressImage } from "@/lib/media";
import { CameraCapture, hasCameraApi } from "@/components/ui/CameraCapture";

interface Product { id: string; name: string; unit: string; price_per_unit: number; category: string; in_stock: boolean; stock_qty: number; image_url?: string | null }
const EMPTY = { name: "", unit: "kg", price_per_unit: 10000, category: "rau_la", stock_qty: 20, image_url: null as string | null };

export function ProductManager({ farmId, initial }: { farmId: string; initial: Product[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [closing, setClosing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const { show } = useSnackbar();

  const openNew = () => { setForm(EMPTY); setEditing("new"); };
  const openEdit = (p: Product) => { setForm({ name: p.name, unit: p.unit, price_per_unit: p.price_per_unit, category: p.category, stock_qty: p.stock_qty, image_url: p.image_url ?? null }); setEditing(p); };
  const [uploading, setUploading] = useState(false);
  const [camera, setCamera] = useState(false);
  const [qrFor, setQrFor] = useState<Product | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadImage = async (f: File) => {
    setUploading(true);
    try {
      const small = await compressImage(f);
      const fd = new FormData(); fd.append("file", small);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không tải được ảnh");
      setForm((x) => ({ ...x, image_url: data.url }));
    } catch (e) { show(e instanceof Error ? e.message : "Lỗi tải ảnh", { kind: "error" }); }
    finally { setUploading(false); }
  };

  // Debounced stock adjustment: quick +/- taps, one PATCH after the taps stop.
  const pendingRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const setStock = (p: Product, next: number) => {
    next = Math.max(0, Math.min(100000, Math.round(next)));
    setItems((xs) => xs.map((x) => (x.id === p.id ? { ...x, stock_qty: next, in_stock: next > 0 } : x)));
    clearTimeout(pendingRef.current[p.id]);
    pendingRef.current[p.id] = setTimeout(async () => {
      const res = await fetch("/api/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, stock_qty: next }) });
      if (!res.ok) { show("Không lưu được tồn kho", { kind: "error" }); router.refresh(); }
    }, 500);
  };
  const adjustStock = (p: Product, delta: number) => setStock(p, p.stock_qty + delta);
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
            <div key={p.id} className="m3-list-item" style={{ cursor: "default", opacity: p.in_stock && p.stock_qty > 0 ? 1 : 0.6, flexWrap: "wrap" }}>
              <ProductThumb image_url={p.image_url} category={p.category} name={p.name} size={52} />
              <div style={{ flex: 1, minWidth: 160 }}>
                <p className="title-sm text-on-surface">{p.name} <span className="m3-chip sm" style={{ marginLeft: 6, height: 22, fontSize: 11 }}>{CATEGORY_LABELS[p.category] ?? p.category}</span></p>
                <p className="label-lg text-primary tabular">{formatVND(p.price_per_unit)} <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>/ {p.unit}</span></p>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {/* Stock counter: auto-decrements when customers order */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: p.stock_qty > 0 ? "var(--md-primary-container)" : "var(--md-error-container)", color: p.stock_qty > 0 ? "var(--md-on-primary-container)" : "var(--md-on-error-container)", borderRadius: "var(--shape-full)", padding: 3 }} title="Số lượng còn bán">
                  <button className="m3-icon-btn sm" onClick={() => adjustStock(p, -1)} aria-label="Bớt 1" style={{ background: "var(--md-surface-container-lowest)", color: "var(--md-on-surface)" }} disabled={p.stock_qty <= 0}><Icon name="remove" size={18} /></button>
                  <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, minWidth: 64, justifyContent: "center" }}>
                    <QtyInput value={p.stock_qty} max={100000} width={44} onCommit={(n) => setStock(p, n)} />
                    <span className="label-lg">{p.unit}</span>
                  </span>
                  <button className="m3-icon-btn sm filled" onClick={() => adjustStock(p, +1)} aria-label="Thêm 1"><Icon name="add" size={18} /></button>
                </div>
                <button className={`m3-btn m3-btn-sm ${p.in_stock && p.stock_qty > 0 ? "m3-btn-tonal-primary" : "m3-btn-error"}`} onClick={() => toggleStock(p)} disabled={busy === p.id || (p.stock_qty <= 0 && !p.in_stock)} aria-pressed={p.in_stock} title={p.stock_qty <= 0 ? "Thêm số lượng để mở bán" : undefined}>
                  <Icon name={p.in_stock && p.stock_qty > 0 ? "check_circle" : "block"} size={18} filled />
                  <span>{p.in_stock && p.stock_qty > 0 ? "Đang bán" : "Hết hàng"}</span>
                </button>
                <button className="m3-icon-btn tonal" onClick={() => setQrFor(p)} aria-label={`Mã QR ${p.name}`} title="Mã QR sản phẩm"><Icon name="qr_code_2" size={20} /></button>
                <button className="m3-icon-btn tonal" onClick={() => openEdit(p)} aria-label={`Sửa ${p.name}`}><Icon name="edit" size={20} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrFor && (
        <Portal>
          <div className="m3-scrim" onClick={() => setQrFor(null)} aria-hidden />
          <div className="m3-dialog" role="dialog" aria-modal="true" style={{ width: "min(420px, calc(100vw - 32px))", textAlign: "center" }}>
            <h2 className="headline-sm" style={{ marginBottom: 4 }}>Mã QR · {qrFor.name}</h2>
            <p className="body-sm text-on-surface-variant" style={{ marginBottom: 14 }}>Dán lên quầy hoặc bao bì; khách quét là mở đúng món này trong cửa hàng.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/link?to=${encodeURIComponent(`/rau-cu?mon=${qrFor.name}`)}`} alt={`QR ${qrFor.name}`} width={220} height={220} style={{ background: "#fff", padding: 10, borderRadius: 16, display: "inline-block" }} />
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <a href={`/api/qr/link?to=${encodeURIComponent(`/rau-cu?mon=${qrFor.name}`)}`} download={`qr-${qrFor.name}.svg`} className="m3-btn m3-btn-tonal"><Icon name="download" /><span>Tải SVG</span></a>
              <button type="button" className="m3-btn m3-btn-filled" onClick={() => window.print()}><Icon name="print" /><span>In</span></button>
              <button type="button" className="m3-btn m3-btn-text" onClick={() => setQrFor(null)}>Đóng</button>
            </div>
          </div>
        </Portal>
      )}
      {camera && <CameraCapture modes={["photo"]} initialFacing="environment" title="Ảnh sản phẩm" onClose={() => setCamera(false)} onCapture={(f) => void uploadImage(f)} />}
      {editing && (
        <>
<Portal>
          <div className={`m3-scrim ${closing ? "closing" : ""}`} onClick={close} aria-hidden />
          <form className={`m3-dialog ${closing ? "closing" : ""}`} onSubmit={save} role="dialog" aria-modal="true">
            <div className="m3-dialog-icon"><Icon name={editing === "new" ? "add_circle" : "edit"} size={24} filled /></div>
            <div className="m3-dialog-header">
              <h2 className="m3-dialog-title">{editing === "new" ? "Thêm sản phẩm" : "Sửa sản phẩm"}</h2>
            </div>
            <div className="m3-dialog-body">
              <div className="m3-field">
                <label className="m3-field-label">Ảnh sản phẩm</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <ProductThumb image_url={form.image_url} category={form.category} name={form.name || "Sản phẩm"} size={88} radius="var(--shape-lg)" />
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void uploadImage(f); }} />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" className="m3-btn m3-btn-tonal m3-btn-sm" onClick={() => (hasCameraApi() ? setCamera(true) : fileRef.current?.click())} disabled={uploading}>{uploading ? <span className="m3-loader sm" /> : <Icon name="photo_camera" size={18} />}<span>Chụp</span></button>
                    <button type="button" className="m3-btn m3-btn-outlined m3-btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}><Icon name="image" size={18} /><span>Chọn ảnh</span></button>
                    {form.image_url && <button type="button" className="m3-btn m3-btn-text m3-btn-sm" onClick={() => setForm({ ...form, image_url: null })} style={{ color: "var(--md-error)" }}><Icon name="delete" size={18} /><span>Gỡ</span></button>}
                  </div>
                </div>
                <p className="body-sm text-on-surface-variant">Ảnh được nén còn ≤1280px trước khi tải lên. Không có ảnh thì hiện màu theo loại rau.</p>
              </div>
              <div className="m3-field">
                <label className="m3-field-label" htmlFor="pm-name">Tên sản phẩm</label>
                <input id="pm-name" className="m3-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} placeholder="Ví dụ: Cải ngọt" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div className="m3-field">
                  <label className="m3-field-label" htmlFor="pm-stock">Còn lại</label>
                  <input id="pm-stock" type="number" min={0} step={1} className="m3-input" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: Math.max(0, Number(e.target.value)) })} required />
                </div>
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
</Portal>
        </>
      )}
    </>
  );
}
