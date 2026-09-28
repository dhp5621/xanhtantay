"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CameraCapture, hasCameraApi } from "@/components/ui/CameraCapture";
import { formatKg } from "@/lib/commerce";
import { makePhotoDataUrl } from "@/lib/media";

export interface Proposal { id: string; name: string; category: string; daily_kg: number; image_url: string | null; note: string | null; status: string; reason: string | null }
const STATUS: Record<string, { label: string; chip: string; icon: string }> = {
  pending: { label: "Chờ duyệt", chip: "m3-chip-tertiary", icon: "hourglass_top" },
  approved: { label: "Đã duyệt", chip: "m3-chip-primary", icon: "check_circle" },
  rejected: { label: "Chưa được duyệt", chip: "m3-chip-error", icon: "cancel" },
};
const EMPTY = { name: "", category: "rau_la", daily_kg: 10, image_url: "", note: "" };

/** Produce that is not on the platform's list yet: the farmer proposes it with a photo, the operator approves. */
export function ProduceProposals({ initial, you = "bạn" }: { initial: Proposal[]; you?: string }) {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);
  const [camera, setCamera] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const pick = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { show } = useSnackbar();

  const usePhoto = async (file?: File | null) => {
    if (!file) return;
    try { setForm((f) => ({ ...f, image_url: "" })); const url = await makePhotoDataUrl(file); setForm((f) => ({ ...f, image_url: url })); }
    catch (e) { show(e instanceof Error ? e.message : "Không đọc được ảnh", { kind: "error" }); }
  };
  const call = async (key: string, url: string, init: RequestInit, done: string) => {
    setBusy(key);
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Chưa gửi được, xin thử lại giúp ạ");
      setList(data.proposals);
      show(done, { kind: "success", duration: 6000 });
      router.refresh();
      return true;
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error", duration: 6000 }); }
    finally { setBusy(null); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await call("new", "/api/farmer/produce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, image_url: form.image_url || undefined }) }, "Đã gửi. Quản trị duyệt xong là có trong danh sách ạ.");
    if (ok) { setOpen(false); setForm(EMPTY); }
  };

  return (
    <section>
      <h2 className="title-lg text-on-surface" style={{ marginBottom: 6 }}>Rau củ khác</h2>
      <p className="body-md text-on-surface-variant" style={{ marginBottom: 12 }}>Vườn có loại rau củ chưa có trong danh sách? {you.charAt(0).toUpperCase() + you.slice(1)} gửi tên, ảnh và sản lượng, quản trị duyệt xong là có trong danh sách.</p>
      {list.length > 0 && (
        <div className="m3-list-group" style={{ marginBottom: 12 }}>
          {list.map((p) => {
            const s = STATUS[p.status] ?? STATUS.pending;
            return (
              <div key={p.id} className="m3-list-item m3-capacity-row" style={{ cursor: "default" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="m3-capacity-photo">{p.image_url ? <img src={p.image_url} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="eco" filled />}</span>
                <span className="m3-capacity-name">
                  <span className="title-md" style={{ display: "block" }}>{p.name}</span>
                  <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400, display: "block" }}>{formatKg(p.daily_kg)} mỗi ngày</span>
                  {p.status === "rejected" && p.reason && <span className="body-sm" style={{ display: "block", color: "var(--md-error)" }}>Lý do: {p.reason}</span>}
                </span>
                <span className="m3-capacity-ctrl">
                  <span className={`m3-chip sm round ${s.chip}`}><Icon name={s.icon} size={14} filled /> {s.label}</span>
                  {p.status === "pending" && <button type="button" className="m3-btn m3-btn-text m3-btn-sm" disabled={!!busy} onClick={() => call(p.id, `/api/farmer/produce/${p.id}`, { method: "DELETE" }, "Đã rút yêu cầu")}>{busy === p.id ? <span className="m3-loader sm" /> : null}<span>Rút yêu cầu</span></button>}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <button type="button" className="m3-btn m3-btn-tonal-primary" style={{ height: 56, width: "100%" }} onClick={() => setOpen(true)}><Icon name="add_photo_alternate" /><span>Đăng ký rau củ mới</span></button>

      {open && (
        <Portal>
          <div className="m3-scrim" onClick={() => setOpen(false)} aria-hidden />
          <form className="m3-dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="pp-title">
            <h2 id="pp-title" className="headline-sm" style={{ marginBottom: 4 }}>Đăng ký rau củ mới</h2>
            <p className="body-sm text-on-surface-variant" style={{ marginBottom: 16 }}>Quản trị sẽ xem và duyệt trước khi đưa vào danh sách.</p>
            <div className="flex flex-col gap-3">
              <div className="m3-field"><label className="m3-field-label" htmlFor="pp-name">Tên rau củ</label>
                <input id="pp-name" className="m3-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={40} minLength={2} placeholder="Ví dụ: Rau bò khai" required /></div>
              <div className="m3-field"><span className="m3-field-label">Loại</span>
                <div className="m3-button-group" style={{ display: "flex" }}>
                  {[["rau_la", "Rau lá"], ["cu_qua", "Củ quả"]].map(([v, l]) => <button key={v} type="button" className={`m3-seg ${form.category === v ? "selected" : ""}`} aria-pressed={form.category === v} onClick={() => setForm({ ...form, category: v })}>{l}</button>)}
                </div></div>
              <div className="m3-field"><label className="m3-field-label" htmlFor="pp-kg">Mỗi ngày cắt được (kg)</label>
                <input id="pp-kg" className="m3-input" type="number" inputMode="numeric" min={1} max={500} value={form.daily_kg} onChange={(e) => setForm({ ...form, daily_kg: Math.min(500, Math.max(0, Math.round(Number(e.target.value)) || 0)) })} required /></div>
              <div className="m3-field"><span className="m3-field-label">Ảnh</span>
                <input ref={pick} type="file" accept="image/*" hidden onChange={(e) => { void usePhoto(e.target.files?.[0]); e.target.value = ""; }} />
                <div className="flex items-center gap-3 flex-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {form.image_url && <span className="m3-capacity-photo" style={{ width: 88, height: 88 }}><img src={form.image_url} alt="Ảnh rau củ" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /></span>}
                  {hasCameraApi() && <button type="button" className="m3-btn m3-btn-tonal m3-btn-sm" onClick={() => setCamera(true)}><Icon name="photo_camera" size={18} /><span>Chụp ảnh</span></button>}
                  <button type="button" className="m3-btn m3-btn-tonal m3-btn-sm" onClick={() => pick.current?.click()}><Icon name="image" size={18} /><span>Chọn ảnh</span></button>
                  {form.image_url && <button type="button" className="m3-btn m3-btn-text m3-btn-sm" onClick={() => setForm({ ...form, image_url: "" })}>Bỏ ảnh</button>}
                </div></div>
              <div className="m3-field"><label className="m3-field-label" htmlFor="pp-note">Ghi chú (không bắt buộc)</label>
                <input id="pp-note" className="m3-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={300} placeholder="Ví dụ: chỉ có từ tháng 9 đến tháng 12" /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
              <button type="button" className="m3-btn m3-btn-text" onClick={() => setOpen(false)}>Huỷ</button>
              <button type="submit" className="m3-btn m3-btn-filled" disabled={!!busy || form.name.trim().length < 2 || form.daily_kg < 1}>{busy === "new" ? <span className="m3-loader sm on-primary" /> : <Icon name="send" size={18} />}<span>Gửi yêu cầu duyệt</span></button>
            </div>
          </form>
          {camera && <CameraCapture modes={["photo"]} initialFacing="environment" title="Chụp ảnh rau củ" onClose={() => setCamera(false)} onCapture={(f) => { setCamera(false); void usePhoto(f); }} />}
        </Portal>
      )}
    </section>
  );
}
