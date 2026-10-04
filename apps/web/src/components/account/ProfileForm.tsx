"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";

interface Cluster { id: string; name: string; district: string }

/** Building and flat: used as the default delivery point and to show groups in your building first. */
const GENDERS = [{ value: "", label: "Không nêu" }, { value: "female", label: "Nữ" }, { value: "male", label: "Nam" }];
/** What follows from gender: farmers bác / cô (bác when not given), customers anh / chị (bạn when not given). */
const byGender = (gender: string, farmer: boolean) => (gender === "female" ? (farmer ? "cô" : "chị") : gender === "male" ? (farmer ? "bác" : "anh") : farmer ? "bác" : "bạn");

export function ProfileForm({ initial, clusters, showAddress, farmer = false }: { initial: { name: string; phone: string | null; cluster_id: string | null; address: string | null; gender?: string | null; salutation?: string | null; short_name?: string | null }; clusters: Cluster[]; showAddress: boolean; farmer?: boolean }) {
  const start = { name: initial.name, phone: initial.phone ?? "", cluster_id: initial.cluster_id ?? "", address: initial.address ?? "", gender: initial.gender ?? "", salutation: initial.salutation ?? "", short_name: initial.short_name ?? "" };
  const [form, setForm] = useState(start);
  // "Khác": the person types their own form of address.
  const options = farmer ? ["bác", "cô", "chú"] : ["anh", "chị", "bạn"];
  const [custom, setCustom] = useState(!!start.salutation && !options.includes(start.salutation));
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { update } = useSession();
  const { show } = useSnackbar();
  const dirty = (Object.keys(start) as (keyof typeof start)[]).some((k) => form[k] !== start[k]);
  const auto = byGender(form.gender, farmer);
  const given = form.short_name.trim() || form.name.trim().split(/\s+/).pop() || "";
  const used = form.salutation.trim().toLowerCase() || auto;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, phone: form.phone, gender: form.gender || null, salutation: form.salutation, short_name: form.short_name, ...(showAddress ? { cluster_id: form.cluster_id || null, address: form.address } : {}) }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Không lưu được");
      await update();
      show("Đã lưu thông tin", { kind: "success", duration: 2000 });
      router.refresh();
    } catch (err) { show(err instanceof Error ? err.message : "Có lỗi", { kind: "error" }); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="m3-card-filled flex flex-col gap-3" style={{ padding: 18, borderRadius: "var(--shape-xl)" }}>
      <p className="title-md text-on-surface" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="badge" filled className="text-primary" /> Thông tin của bạn</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="m3-field"><label className="m3-field-label" htmlFor="pf-name">Họ tên</label><input id="pf-name" className="m3-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={60} /></div>
        <div className="m3-field"><label className="m3-field-label" htmlFor="pf-phone">Điện thoại</label><input id="pf-phone" className="m3-input" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} /></div>
      </div>
      {showAddress && (
        <>
          <div className="m3-field"><label className="m3-field-label" htmlFor="pf-cluster">Điểm nhận (ký túc xá / khu trọ)</label>
            <select id="pf-cluster" className="m3-select" value={form.cluster_id} onChange={(e) => setForm({ ...form, cluster_id: e.target.value })}>
              <option value="">— chưa chọn —</option>
              {clusters.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.district}</option>)}
            </select></div>
          <div className="m3-field"><label className="m3-field-label" htmlFor="pf-addr">Nhà · phòng</label><input id="pf-addr" className="m3-input" placeholder="Ví dụ: Nhà B6 · phòng 412" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={120} /></div>
        </>
      )}
      <fieldset className="m3-field" style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className="m3-field-label">Giới tính</legend>
        <div className="m3-button-group" style={{ display: "flex" }} role="radiogroup">
          {GENDERS.map((g) => <button key={g.value} type="button" role="radio" aria-checked={form.gender === g.value} className={`m3-seg ${form.gender === g.value ? "selected" : ""}`} onClick={() => setForm({ ...form, gender: g.value })}>{g.label}</button>)}
        </div>
      </fieldset>
      <fieldset className="m3-field" style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className="m3-field-label">Cách xưng hô</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          <button type="button" role="radio" aria-checked={!custom && !form.salutation} className={`m3-chip ${!custom && !form.salutation ? "selected" : ""}`} onClick={() => { setCustom(false); setForm({ ...form, salutation: "" }); }}>Theo giới tính ({auto})</button>
          {options.map((o) => <button key={o} type="button" role="radio" aria-checked={!custom && form.salutation === o} className={`m3-chip ${!custom && form.salutation === o ? "selected" : ""}`} onClick={() => { setCustom(false); setForm({ ...form, salutation: o }); }}>{o.charAt(0).toUpperCase() + o.slice(1)}</button>)}
          <button type="button" role="radio" aria-checked={custom} className={`m3-chip ${custom ? "selected" : ""}`} onClick={() => { setCustom(true); setForm({ ...form, salutation: options.includes(form.salutation) ? "" : form.salutation }); }}>Khác</button>
        </div>
      </fieldset>
      <div style={{ display: "grid", gridTemplateColumns: custom ? "1fr 1fr" : "1fr", gap: 10 }}>
        {custom && <div className="m3-field"><label className="m3-field-label" htmlFor="pf-sal">Xưng hô tự nhập</label><input id="pf-sal" className="m3-input" value={form.salutation} onChange={(e) => setForm({ ...form, salutation: e.target.value })} maxLength={12} placeholder="Ví dụ: u, dì, thầy" /></div>}
        <div className="m3-field"><label className="m3-field-label" htmlFor="pf-short">Tên gọi</label><input id="pf-short" className="m3-input" value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} maxLength={24} placeholder={given || "Ví dụ: Lan"} /></div>
      </div>
      <p className="body-sm text-on-surface-variant">Chúng tôi sẽ gọi bạn là <strong className="text-on-surface">{used} {given}</strong> trong lời chào và thông báo.</p>
      <button type="submit" className="m3-btn m3-btn-filled" disabled={busy || !dirty} style={{ alignSelf: "flex-end" }}>{busy ? <span className="m3-loader sm on-primary" /> : <Icon name="save" />}<span>Lưu</span></button>
    </form>
  );
}
