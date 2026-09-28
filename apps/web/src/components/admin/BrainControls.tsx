"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { useSnackbar } from "@/components/ui/Snackbar";

/** "Chốt sổ & gửi lệnh": runs the 18:00 cut-off for one delivery date right now. */
export function CutoffButton({ date, label, reallocate = false, disabled = false }: { date: string; label: string; reallocate?: boolean; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const { show } = useSnackbar();
  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/brain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không chốt sổ được");
      show(`Đã chốt ${data.orders} đơn · ${data.boxes} hộp · gửi ${data.commands} lệnh thu hoạch${Number(data.shortage_kg) > 0 ? ` · thiếu ${data.shortage_kg} kg` : " · rau thừa 0%"}`, { kind: Number(data.shortage_kg) > 0 ? "info" : "success", duration: 7000 });
      router.refresh();
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error", duration: 6000 }); }
    finally { setBusy(false); setConfirm(false); }
  };
  return (
    <>
      <button className={`m3-btn m3-btn-lg ${reallocate ? "m3-btn-tonal" : "m3-btn-filled"}`} onClick={() => setConfirm(true)} disabled={busy || disabled}>
        {busy ? <span className={`m3-loader sm ${reallocate ? "" : "on-primary"}`} /> : <Icon name={reallocate ? "refresh" : "psychology"} filled />}
        <span>{reallocate ? "Phân bổ lại" : "Chốt sổ & gửi lệnh"}</span>
      </button>
      {confirm && (
        <Portal>
          <div className="m3-scrim" onClick={() => setConfirm(false)} aria-hidden />
          <div className="m3-dialog" role="alertdialog" aria-modal="true" style={{ width: "min(460px, calc(100vw - 32px))" }}>
            <span className="m3-list-leading" style={{ marginBottom: 12 }}><Icon name="psychology" filled /></span>
            <h2 className="headline-sm" style={{ marginBottom: 6 }}>{reallocate ? "Phân bổ lại chuyến này?" : "Chốt sổ ngay bây giờ?"}</h2>
            <p className="body-md text-on-surface-variant">Chuyến giao {label}. Hệ thống sẽ cộng tổng nhu cầu, chia lệnh thu hoạch cho từng nông hộ theo năng suất và gửi thông báo cho họ. Khách không huỷ được đơn sau bước này.{reallocate ? " Các lệnh cũ của chuyến này sẽ được thay bằng lệnh mới và cần xác nhận lại." : ""}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
              <button className="m3-btn m3-btn-text" onClick={() => setConfirm(false)}>Để sau</button>
              <button className="m3-btn m3-btn-filled" onClick={run} disabled={busy}>{busy ? <span className="m3-loader sm on-primary" /> : <Icon name="send" />}<span>{reallocate ? "Phân bổ lại" : "Chốt sổ"}</span></button>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

const NEXT: Record<string, { label: string; icon: string; time: string }> = {
  allocated: { label: "Bắt đầu thu hoạch", icon: "agriculture", time: "4h00" },
  harvesting: { label: "Xe lạnh đã lấy hàng", icon: "local_shipping", time: "6h00" },
  loaded: { label: "Đã tới sảnh chung cư", icon: "apartment", time: "16h00" },
};

/** Moves a run (and all its orders) to the next stage and notifies the customers. */
export function AdvanceRunButton({ runId, status }: { runId: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useSnackbar();
  const next = NEXT[status];
  if (!next) return <span className="m3-chip round m3-chip-primary"><Icon name="check_circle" size={18} filled /> Hoàn tất</span>;
  const go = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/runs/${runId}/advance`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không cập nhật được");
      show(`${next.time}: ${next.label.toLowerCase()}. Đã báo cho ${data.customers?.length ?? 0} khách.`, { kind: "success" });
      router.refresh();
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error" }); }
    finally { setBusy(false); }
  };
  return (
    <button className="m3-btn m3-btn-tonal-primary" onClick={go} disabled={busy}>
      {busy ? <span className="m3-loader sm" /> : <Icon name={next.icon} />}<span>{next.time} · {next.label}</span>
    </button>
  );
}
