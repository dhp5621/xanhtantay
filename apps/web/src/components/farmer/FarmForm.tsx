"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";
import { RequestBanner, type RequestInfo } from "./RequestBanner";

type Fields = { name: string; location: string; province: string; description: string };
export interface FarmData extends RequestInfo { name: string; location: string; province: string; description: string | null; slug: string; pending: (NonNullable<RequestInfo["pending"]> & { payload: Partial<Record<keyof Fields, string | null>> }) | null }
const MAX_DESCRIPTION = 1200;
const LABELS: Record<keyof Fields, string> = { name: "Tên vườn", location: "Địa chỉ vườn", province: "Tỉnh", description: "Giới thiệu vườn" };
const KEYS = Object.keys(LABELS) as (keyof Fields)[];
const inForce = (d: FarmData): Fields => ({ name: d.name, location: d.location, province: d.province, description: d.description ?? "" });
/** What the form starts from: the values asked for while a request is open, else the ones in force. */
const asked = (d: FarmData): Fields => ({ ...inForce(d), ...Object.fromEntries(Object.entries(d.pending?.payload ?? {}).map(([k, v]) => [k, v ?? ""])) });
const short = (s: string) => (s.length > 80 ? `${s.slice(0, 80)}…` : s || "(để trống)");

/** How the farm is presented to customers. Changes are requests: the operator approves them first. */
export function FarmForm({ initial }: { initial: FarmData }) {
  const [data, setData] = useState(initial);
  const [form, setForm] = useState(() => asked(initial));
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useSnackbar();
  const base = asked(data), now = inForce(data);
  const edited = KEYS.filter((k) => form[k].trim() !== base[k].trim());
  const wanted = KEYS.filter((k) => form[k].trim() !== now[k].trim());

  const call = async (method: "PATCH" | "DELETE", done: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/farms/mine", { method, headers: { "Content-Type": "application/json" }, body: method === "PATCH" ? JSON.stringify(Object.fromEntries(wanted.map((k) => [k, form[k]]))) : undefined });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Chưa gửi được, bác thử lại nhé");
      setData(json); setForm(asked(json));
      show(done, { kind: "success", duration: 6000 });
      router.refresh();
    } catch (err) { show(err instanceof Error ? err.message : "Có lỗi", { kind: "error", duration: 6000 }); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <RequestBanner state={data} lines={Object.entries(data.pending?.payload ?? {}).map(([k, v]) => `${LABELS[k as keyof Fields]}: ${short(now[k as keyof Fields])} → ${short(v ?? "")}`)} onWithdraw={() => call("DELETE", "Đã rút yêu cầu")} />
      <form onSubmit={(e) => { e.preventDefault(); call("PATCH", "Đã gửi. Quản trị sẽ duyệt rồi thay đổi mới có hiệu lực."); }} className="m3-card-filled flex flex-col gap-4" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}>
        <div className="m3-field"><label className="m3-field-label" htmlFor="ff-name">Tên vườn</label>
          <input id="ff-name" className="m3-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} minLength={2} required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="m3-field"><label className="m3-field-label" htmlFor="ff-location">Địa chỉ vườn (huyện, tỉnh)</label>
            <input id="ff-location" className="m3-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={120} minLength={2} placeholder="Ví dụ: Ba Bể, Bắc Kạn" required /></div>
          <div className="m3-field"><label className="m3-field-label" htmlFor="ff-province">Tỉnh</label>
            <input id="ff-province" className="m3-input" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} maxLength={40} minLength={2} placeholder="Ví dụ: Bắc Kạn" required /></div>
        </div>
        <div className="m3-field"><label className="m3-field-label" htmlFor="ff-desc">Giới thiệu vườn</label>
          <textarea id="ff-desc" className="m3-textarea" rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={MAX_DESCRIPTION} placeholder="Vườn ở đâu, trồng thế nào, nhà mình làm vườn bao lâu rồi…" />
          <span className="body-sm text-on-surface-variant tabular" style={{ alignSelf: "flex-end" }}>{form.description.length}/{MAX_DESCRIPTION}</span></div>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="submit" className="m3-btn m3-btn-filled" disabled={busy || !edited.length || !wanted.length}>{busy ? <span className="m3-loader sm on-primary" /> : <Icon name="send" size={18} />}<span>Gửi yêu cầu duyệt</span></button>
          <Link href={`/farms/${data.slug}`} className="m3-btn m3-btn-text"><Icon name="visibility" size={18} /><span>Xem trang vườn như khách thấy</span></Link>
        </div>
        <p className="body-sm text-on-surface-variant">Thay đổi chỉ có hiệu lực sau khi quản trị duyệt.{data.pending ? " Gửi lại sẽ thay cho yêu cầu đang chờ." : ""}</p>
      </form>
    </div>
  );
}
