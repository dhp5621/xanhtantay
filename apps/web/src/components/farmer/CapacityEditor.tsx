"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { useSnackbar } from "@/components/ui/Snackbar";
import { formatKg } from "@/lib/commerce";

export interface CapacityItem { produce_id: string; name: string; category: string; image_url: string | null; daily_kg: number }
const MAX = 500, STEP = 5, START = 10;

/** What the farm can cut per day, per produce. The brain never commands more than this. */
export function CapacityEditor({ initial }: { initial: CapacityItem[] }) {
  const [saved, setSaved] = useState(initial);
  const [kg, setKg] = useState<Record<string, number>>(() => Object.fromEntries(initial.map((i) => [i.produce_id, i.daily_kg])));
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useSnackbar();

  const set = (id: string, v: number) => setKg((k) => ({ ...k, [id]: Math.min(MAX, Math.max(0, Math.round(v) || 0)) }));
  const changed = saved.filter((i) => kg[i.produce_id] !== i.daily_kg);
  const supplied = saved.filter((i) => kg[i.produce_id] > 0);
  const rest = saved.filter((i) => !(kg[i.produce_id] > 0));
  const total = supplied.reduce((s, i) => s + kg[i.produce_id], 0);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/farmer/capacity", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: changed.map((i) => ({ produce_id: i.produce_id, daily_kg: kg[i.produce_id] })) }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Chưa lưu được, bác thử lại nhé");
      setSaved(data.items);
      setKg(Object.fromEntries((data.items as CapacityItem[]).map((i) => [i.produce_id, i.daily_kg])));
      show("Đã lưu. Áp dụng từ lần chốt sổ 18h00 kế tiếp.", { kind: "success" });
      router.refresh();
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
          <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{v > 0 ? `Tối đa ${formatKg(v)} mỗi ngày` : "Chưa đăng ký"}</span>
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
          <button type="button" className="m3-btn m3-btn-tonal-primary m3-btn-sm" onClick={() => set(i.produce_id, START)}><Icon name="add" size={18} /><span>Đăng ký</span></button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="m3-card-filled" style={{ padding: 20, borderRadius: "var(--shape-xl)", display: "flex", gap: 14, alignItems: "center" }}>
        <span className="m3-list-leading"><Icon name="scale" filled /></span>
        <div>
          <p className="headline-sm text-on-surface tabular">{supplied.length} loại · {formatKg(total)} mỗi ngày</p>
          <p className="body-sm text-on-surface-variant">Hệ thống không bao giờ gửi lệnh nhiều hơn số bác đăng ký.</p>
        </div>
      </div>
      <section>
        <h2 className="title-lg text-on-surface" style={{ marginBottom: 12 }}>Đang cung cấp</h2>
        {supplied.length ? <div className="m3-list-group">{supplied.map(row)}</div> : <p className="body-md text-on-surface-variant">Bác chưa đăng ký loại rau củ nào.</p>}
      </section>
      {rest.length > 0 && (
        <section>
          <h2 className="title-lg text-on-surface" style={{ marginBottom: 12 }}>Chưa đăng ký</h2>
          <div className="m3-list-group">{rest.map(row)}</div>
        </section>
      )}
      <div className="m3-capacity-save">
        <button type="button" className="m3-btn m3-btn-filled m3-command-btn" style={{ height: 64 }} onClick={save} disabled={busy || !changed.length}>
          {busy ? <span className="m3-loader on-primary" style={{ width: 28, height: 28 }} /> : <Icon name="save" filled />}
          <span>{changed.length ? `Lưu thay đổi (${changed.length})` : "Chưa có thay đổi"}</span>
        </button>
        <p className="body-sm text-on-surface-variant" style={{ textAlign: "center", marginTop: 8 }}>Thay đổi áp dụng từ lần chốt sổ 18h00 kế tiếp. Lệnh đã gửi không đổi.</p>
      </div>
    </div>
  );
}
