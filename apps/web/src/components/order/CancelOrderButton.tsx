"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { useSnackbar } from "@/components/ui/Snackbar";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useSnackbar();
  const cancel = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không huỷ được");
      show("Đã huỷ đơn", { kind: "success" });
      router.refresh();
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error" }); }
    finally { setBusy(false); setConfirm(false); }
  };
  return (
    <>
      <button className="m3-btn m3-btn-outlined is-error m3-btn-sm" onClick={() => setConfirm(true)}><Icon name="cancel" size={18} /><span>Huỷ đơn</span></button>
      {confirm && (
        <Portal>
          <div className="m3-scrim" onClick={() => setConfirm(false)} aria-hidden />
          <div className="m3-dialog" role="alertdialog" aria-modal="true" style={{ width: "min(420px, calc(100vw - 32px))" }}>
            <h2 className="headline-sm" style={{ marginBottom: 6 }}>Huỷ hộp rau này?</h2>
            <p className="body-md text-on-surface-variant">Chưa tới giờ chốt sổ nên huỷ không mất phí. Sau 18h00 hôm trước ngày giao, lệnh thu hoạch đã gửi về vườn thì không huỷ được nữa.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
              <button className="m3-btn m3-btn-text" onClick={() => setConfirm(false)}>Giữ đơn</button>
              <button className="m3-btn m3-btn-error" onClick={cancel} disabled={busy}>{busy ? <span className="m3-loader sm" /> : <Icon name="cancel" />}<span>Huỷ đơn</span></button>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
