"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { useSnackbar } from "@/components/ui/Snackbar";

export function JoinGroupButton({ groupId, joined }: { groupId: string; joined: boolean }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(joined);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const { show } = useSnackbar();

  const call = async (action: "join" | "leave") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? (action === "join" ? "Không tham gia được" : "Không rời được"));
      setDone(action === "join");
      show(action === "join" ? "Bạn đã vào nhóm! Rủ thêm hàng xóm để được freeship nhé." : "Bạn đã rời nhóm. Vào lại bất cứ lúc nào trước hạn chốt.", { kind: "success" });
      router.refresh();
    } catch (e) {
      show(e instanceof Error ? e.message : "Có lỗi xảy ra", { kind: "error" });
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  const join = () => { if (!session) { router.push(`/dang-nhap?next=/gom-don/${groupId}&role=customer`); return; } void call("join"); };

  if (done) {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2 anim-in-scale" style={{ justifyContent: "center" }}>
          <span className="m3-chip m3-chip-primary round" style={{ height: 44, padding: "0 20px", fontSize: 14 }}>
            <Icon name="check_circle" filled size={20} /> Bạn đã tham gia nhóm này
          </span>
          <button className="m3-btn m3-btn-outlined is-error" onClick={() => setConfirm(true)} disabled={loading}>
            <Icon name="logout" size={20} /><span>Rời nhóm</span>
          </button>
        </div>
        {confirm && (
          <Portal>
            <div className="m3-scrim" onClick={() => setConfirm(false)} aria-hidden />
            <div className="m3-dialog" role="alertdialog" aria-modal="true" style={{ width: "min(420px, calc(100vw - 32px))" }}>
              <span className="m3-list-leading" style={{ background: "var(--md-error-container)", color: "var(--md-on-error-container)", marginBottom: 12 }}><Icon name="group_remove" filled /></span>
              <h2 className="headline-sm" style={{ marginBottom: 6 }}>Rời nhóm gom đơn?</h2>
              <p className="body-md text-on-surface-variant">Nhóm sẽ bớt một người và có thể mất điều kiện freeship. Bạn vẫn có thể tham gia lại trước hạn chốt.</p>
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
    <button className="m3-btn m3-btn-filled m3-btn-lg" onClick={join} disabled={loading}>
      {loading ? <span className="m3-loader sm on-primary" /> : <Icon name="group_add" />}
      <span>{loading ? "Đang tham gia…" : "Tham gia nhóm này"}</span>
    </button>
  );
}
