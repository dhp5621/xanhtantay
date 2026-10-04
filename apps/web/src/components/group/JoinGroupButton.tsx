"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { useSnackbar } from "@/components/ui/Snackbar";

export function JoinGroupButton({ groupId, joined, closed }: { groupId: string; joined: boolean; closed: boolean }) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [qty, setQty] = useState(1);
  const router = useRouter();
  const { data: session } = useSession();
  const { show } = useSnackbar();

  const call = async (action: "join" | "leave") => {
    if (!session) { router.push(`/dang-nhap?next=/gom-don/${groupId}&role=customer`); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "join" ? { quantity: qty } : {}) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? (action === "join" ? "Không tham gia được" : "Không rời được"));
      show(action === "join" ? "Bạn đã vào nhóm! Rủ thêm bạn cùng khu để cả nhóm miễn phí giao." : "Bạn đã rời nhóm, hộp rau trong nhóm đã huỷ.", { kind: "success" });
      router.refresh();
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi xảy ra", { kind: "error" }); }
    finally { setLoading(false); setConfirm(false); }
  };

  if (closed) return <span className="m3-chip round m3-chip-surface" style={{ height: 44, padding: "0 20px" }}><Icon name="lock" size={18} /> {joined ? "Bạn ở trong nhóm · đã chốt sổ" : "Nhóm đã chốt sổ"}</span>;

  if (joined) {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2 anim-in-scale" style={{ justifyContent: "center" }}>
          <span className="m3-chip m3-chip-primary round" style={{ height: 44, padding: "0 20px", fontSize: 14 }}><Icon name="check_circle" filled size={20} /> Bạn đã ở trong nhóm</span>
          <button className="m3-btn m3-btn-outlined is-error" onClick={() => setConfirm(true)} disabled={loading}><Icon name="logout" size={20} /><span>Rời nhóm</span></button>
        </div>
        {confirm && (
          <Portal>
            <div className="m3-scrim" onClick={() => setConfirm(false)} aria-hidden />
            <div className="m3-dialog" role="alertdialog" aria-modal="true" style={{ width: "min(420px, calc(100vw - 32px))" }}>
              <h2 className="headline-sm" style={{ marginBottom: 6 }}>Rời nhóm gom đơn?</h2>
              <p className="body-md text-on-surface-variant">Hộp rau của bạn trong nhóm sẽ bị huỷ và nhóm có thể mất điều kiện miễn phí giao. Bạn vào lại được trước giờ chốt sổ.</p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
                <button className="m3-btn m3-btn-text" onClick={() => setConfirm(false)}>Ở lại</button>
                <button className="m3-btn m3-btn-error" onClick={() => call("leave")} disabled={loading}>{loading ? <span className="m3-loader sm" /> : <Icon name="logout" />}<span>Rời nhóm</span></button>
              </div>
            </div>
          </Portal>
        )}
      </>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3" style={{ justifyContent: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--md-primary-container)", color: "var(--md-on-primary-container)", borderRadius: "var(--shape-full)", padding: 3 }}>
        <button type="button" className="m3-icon-btn sm" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Bớt" style={{ background: "var(--md-surface-container-lowest)", color: "var(--md-on-surface)" }}><Icon name="remove" size={18} /></button>
        <span className="label-lg tabular" style={{ minWidth: 56, textAlign: "center" }}>{qty} hộp</span>
        <button type="button" className="m3-icon-btn sm filled" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Thêm"><Icon name="add" size={18} /></button>
      </div>
      <button className="m3-btn m3-btn-filled m3-btn-lg" onClick={() => call("join")} disabled={loading}>
        {loading ? <span className="m3-loader sm on-primary" /> : <Icon name="group_add" />}<span>{loading ? "Đang tham gia…" : "Vào nhóm & đặt hộp"}</span>
      </button>
    </div>
  );
}
