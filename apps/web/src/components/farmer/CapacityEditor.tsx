"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { useSnackbar } from "@/components/ui/Snackbar";
import { formatKg } from "@/lib/commerce";
import { RequestBanner, type RequestInfo } from "./RequestBanner";

export interface CapacityItem { produce_id: string; name: string; category: string; image_url: string | null; daily_kg: number; pending_kg: number | null }
interface Data extends RequestInfo { items: CapacityItem[] }
const MAX = 500, STEP = 5, START = 10;
/** What the form starts from: the value asked for while a request is open, else the one in force. */
const asked = (i: CapacityItem) => i.pending_kg ?? i.daily_kg;
const describe = (i: CapacityItem) => (i.pending_kg === 0 ? `${i.name}: xin ngừng cung cấp` : i.daily_kg === 0 ? `${i.name}: xin đăng ký ${formatKg(i.pending_kg ?? 0)} mỗi ngày` : `${i.name}: ${formatKg(i.daily_kg)} → ${formatKg(i.pending_kg ?? 0)} mỗi ngày`);

/** What the farm can cut per day, per produce. Changes are requests: the operator approves them first. */
export function CapacityEditor({ initial, you = "bạn" }: { initial: Data; you?: string }) {
  const [data, setData] = useState(initial);
  const [kg, setKg] = useState<Record<string, number>>(() => Object.fromEntries(initial.items.map((i) => [i.produce_id, asked(i)])));
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useSnackbar();

  const set = (id: string, v: number) => setKg((k) => ({ ...k, [id]: Math.min(MAX, Math.max(0, Math.round(v) || 0)) }));
  const edited = data.items.filter((i) => kg[i.produce_id] !== asked(i));
  // The request always lists every difference from what is in force, not only the last edits.
  const wanted = data.items.filter((i) => kg[i.produce_id] !== i.daily_kg);
  const supplied = data.items.filter((i) => i.daily_kg > 0 || kg[i.produce_id] > 0);
  const rest = data.items.filter((i) => !(i.daily_kg > 0 || kg[i.produce_id] > 0));
  const inForce = data.items.filter((i) => i.daily_kg > 0);

  const apply = (next: Data) => { setData(next); setKg(Object.fromEntries(next.items.map((i) => [i.produce_id, asked(i)]))); router.refresh(); };
  const call = async (method: "PUT" | "DELETE", done: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/farmer/capacity", { method, headers: { "Content-Type": "application/json" }, body: method === "PUT" ? JSON.stringify({ items: wanted.map((i) => ({ produce_id: i.produce_id, daily_kg: kg[i.produce_id] })) }) : undefined });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Chưa gửi được, ${you} thử lại giúp nhé`);
      apply(json);
      show(done, { kind: "success", duration: 6000 });
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error", duration: 6000 }); }
    finally { setBusy(false); }
  };

  const row = (i: CapacityItem) => {
    const v = kg[i.produce_id];
    return (
      <div key={i.produce_id} className="m3-list-item m3-capacity-row" style={{ cursor: "default" }}>
        <span className="m3-capacity-photo">{i.image_url ? <SmartImage src={i.image_url} alt={i.name} style={{ position: "absolute", inset: 0 }} /> : <Icon name="eco" filled />}</span>
        <span className="m3-capacity-name">
          <span className="title-md" style={{ display: "block" }}>{i.name}</span>
          <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400, display: "block" }}>{i.daily_kg > 0 ? `Đang có hiệu lực: ${formatKg(i.daily_kg)} mỗi ngày` : "Chưa đăng ký"}</span>
          {i.pending_kg !== null && <span className="body-sm" style={{ display: "block", color: "var(--md-tertiary)", fontWeight: 600 }}>{i.pending_kg === 0 ? "Đã xin ngừng cung cấp, chờ duyệt" : i.daily_kg === 0 ? `Đã xin đăng ký ${formatKg(i.pending_kg)}, chờ duyệt` : `Đã xin đổi thành ${formatKg(i.pending_kg)}, chờ duyệt`}</span>}
        </span>
        {v > 0 ? (
          <span className="m3-capacity-ctrl">
            <span className="m3-stepper">
              <button type="button" className="m3-icon-btn" onClick={() => set(i.produce_id, v - STEP)} aria-label={`Giảm ${i.name} ${STEP} ký`}><Icon name="remove" /></button>
              <input className="m3-stepper-input tabular" type="number" inputMode="numeric" min={0} max={MAX} value={v} onChange={(e) => set(i.produce_id, Number(e.target.value))} aria-label={`${i.name}, ký mỗi ngày`} />
              <button type="button" className="m3-icon-btn" onClick={() => set(i.produce_id, v + STEP)} aria-label={`Tăng ${i.name} ${STEP} ký`}><Icon name="add" /></button>
            </span>
            <button type="button" className="m3-btn m3-btn-text m3-btn-sm" onClick={() => set(i.produce_id, 0)}>Ngừng cung cấp</button>
          </span>
        ) : (
          <button type="button" className="m3-btn m3-btn-tonal-primary m3-btn-sm" onClick={() => set(i.produce_id, i.daily_kg || START)}><Icon name="add" size={18} /><span>{i.daily_kg > 0 ? "Cung cấp lại" : "Đăng ký"}</span></button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <RequestBanner you={you} state={data} lines={data.items.filter((i) => i.pending_kg !== null).map(describe)} onWithdraw={() => call("DELETE", "Đã rút yêu cầu")} />
      <div className="m3-card-filled" style={{ padding: 20, borderRadius: "var(--shape-xl)", display: "flex", gap: 14, alignItems: "center" }}>
        <span className="m3-list-leading"><Icon name="scale" filled /></span>
        <div>
          <p className="headline-sm text-on-surface tabular">{inForce.length} loại · {formatKg(inForce.reduce((s, i) => s + i.daily_kg, 0))} mỗi ngày</p>
          <p className="body-sm text-on-surface-variant">Đây là số đang có hiệu lực. Hệ thống không bao giờ gửi lệnh nhiều hơn số này.</p>
        </div>
      </div>
      <section>
        <h2 className="title-lg text-on-surface" style={{ marginBottom: 12 }}>Đang cung cấp</h2>
        {supplied.length ? <div className="m3-list-group">{supplied.map(row)}</div> : <p className="body-md text-on-surface-variant">{you.charAt(0).toUpperCase() + you.slice(1)} chưa đăng ký loại rau củ nào.</p>}
      </section>
      {rest.length > 0 && (
        <section>
          <h2 className="title-lg text-on-surface" style={{ marginBottom: 12 }}>Chưa đăng ký</h2>
          <div className="m3-list-group">{rest.map(row)}</div>
        </section>
      )}
      <div className="m3-capacity-save">
        <button type="button" className="m3-btn m3-btn-filled m3-command-btn" style={{ height: 64 }} onClick={() => call("PUT", "Đã gửi. Quản trị sẽ duyệt rồi thay đổi mới có hiệu lực.")} disabled={busy || !edited.length || !wanted.length}>
          {busy ? <span className="m3-loader on-primary" style={{ width: 28, height: 28 }} /> : <Icon name="send" filled />}
          <span>{edited.length ? `Gửi yêu cầu duyệt (${wanted.length})` : "Chưa có thay đổi"}</span>
        </button>
        <p className="body-sm text-on-surface-variant" style={{ textAlign: "center", marginTop: 8 }}>Thay đổi chỉ có hiệu lực sau khi quản trị duyệt. Lệnh đã gửi không đổi.{data.pending ? " Gửi lại sẽ thay cho yêu cầu đang chờ." : ""}</p>
      </div>
    </div>
  );
}
