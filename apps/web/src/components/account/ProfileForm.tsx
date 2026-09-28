"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";

interface Cluster { id: string; name: string; district: string }

/** Building and flat: used as the default delivery point and to show groups in your building first. */
export function ProfileForm({ initial, clusters, showAddress }: { initial: { name: string; phone: string | null; cluster_id: string | null; address: string | null }; clusters: Cluster[]; showAddress: boolean }) {
  const [form, setForm] = useState({ name: initial.name, phone: initial.phone ?? "", cluster_id: initial.cluster_id ?? "", address: initial.address ?? "" });
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { update } = useSession();
  const { show } = useSnackbar();
  const dirty = form.name !== initial.name || form.phone !== (initial.phone ?? "") || form.cluster_id !== (initial.cluster_id ?? "") || form.address !== (initial.address ?? "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, phone: form.phone, ...(showAddress ? { cluster_id: form.cluster_id || null, address: form.address } : {}) }) });
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
          <div className="m3-field"><label className="m3-field-label" htmlFor="pf-cluster">Chung cư</label>
            <select id="pf-cluster" className="m3-select" value={form.cluster_id} onChange={(e) => setForm({ ...form, cluster_id: e.target.value })}>
              <option value="">— chưa chọn —</option>
              {clusters.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.district}</option>)}
            </select></div>
          <div className="m3-field"><label className="m3-field-label" htmlFor="pf-addr">Toà · căn hộ</label><input id="pf-addr" className="m3-input" placeholder="Ví dụ: T5 · căn 1208" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={120} /></div>
        </>
      )}
      <button type="submit" className="m3-btn m3-btn-filled" disabled={busy || !dirty} style={{ alignSelf: "flex-end" }}>{busy ? <span className="m3-loader sm on-primary" /> : <Icon name="save" />}<span>Lưu</span></button>
    </form>
  );
}
