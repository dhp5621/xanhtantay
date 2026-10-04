"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";
import { FREQUENCY_LABELS, formatYMD } from "@/lib/commerce";

/**
 * Quantity, frequency, pause / resume, and moving the next box to another delivery day.
 * `moveDates` are the delivery days still open; `canMove` is false once the next box is within
 * 24 hours of its cut-off (the server enforces the same rule).
 */
export function SubscriptionActions({ id, active, quantity, frequency, nextDelivery, moveDates, canMove }: { id: string; active: boolean; quantity: number; frequency: string; nextDelivery: string; moveDates: string[]; canMove: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useSnackbar();

  const patch = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/subscriptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Không cập nhật được");
      show(ok, { kind: "success", duration: 2000 });
      router.refresh();
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error" }); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--md-surface-container-highest)", borderRadius: "var(--shape-full)", padding: 3 }}>
        <button className="m3-icon-btn sm" onClick={() => patch({ quantity: quantity - 1 }, "Đã giảm số hộp")} disabled={busy || quantity <= 1} aria-label="Bớt hộp"><Icon name="remove" size={18} /></button>
        <span className="label-lg tabular" style={{ minWidth: 52, textAlign: "center" }}>{quantity} hộp</span>
        <button className="m3-icon-btn sm" onClick={() => patch({ quantity: quantity + 1 }, "Đã thêm hộp")} disabled={busy || quantity >= 10} aria-label="Thêm hộp"><Icon name="add" size={18} /></button>
      </div>
      <select className="admin-select" value={frequency} onChange={(e) => patch({ frequency: e.target.value }, "Đã đổi tần suất")} disabled={busy} aria-label="Tần suất">
        {Object.entries(FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {active && (
        <select className="admin-select" value={nextDelivery} onChange={(e) => patch({ next_delivery: e.target.value }, "Đã dời ngày giao hộp tiếp theo")} disabled={busy || !canMove} aria-label="Dời ngày giao hộp tiếp theo" title={canMove ? "Dời hộp tiếp theo sang ngày giao khác" : "Chỉ dời được trước giờ chốt sổ ít nhất 24 giờ"}>
          {(moveDates.includes(nextDelivery) ? moveDates : [nextDelivery, ...moveDates]).map((d) => <option key={d} value={d}>{d === nextDelivery ? "Hộp tới: " : "Dời sang "}{formatYMD(d, { weekday: "short", day: "numeric", month: "numeric" })}</option>)}
        </select>
      )}
      <button className={`m3-btn m3-btn-sm ${active ? "m3-btn-outlined is-error" : "m3-btn-tonal-primary"}`} onClick={() => patch({ active: !active }, active ? "Đã tạm dừng gói" : "Gói đã chạy lại")} disabled={busy}>
        <Icon name={active ? "pause_circle" : "play_circle"} size={18} /><span>{active ? "Tạm dừng" : "Chạy lại"}</span>
      </button>
    </div>
  );
}
