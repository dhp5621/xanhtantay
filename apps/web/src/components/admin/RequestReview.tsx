"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";

/** Approve or turn down one change a farmer asked for. A reason is sent to the farmer. */
export function RequestReview({ id }: { id: string }) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const router = useRouter();
  const { show } = useSnackbar();
  const decide = async (action: "approve" | "reject") => {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/requests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Chưa xử lý được");
      show(action === "approve" ? "Đã duyệt. Thay đổi có hiệu lực ngay." : "Đã từ chối. Nông hộ được báo lý do.", { kind: "success" });
      router.refresh();
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error", duration: 6000 }); }
    finally { setBusy(null); }
  };
  return (
    <div className="flex flex-col gap-2" style={{ marginTop: 12 }}>
      <input className="m3-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Lý do (gửi cho nông hộ khi từ chối)" aria-label="Lý do" />
      <div className="flex gap-2 flex-wrap" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="m3-btn m3-btn-outlined m3-btn-sm" onClick={() => decide("reject")} disabled={!!busy}>{busy === "reject" ? <span className="m3-loader sm" /> : <Icon name="close" size={18} />}<span>Từ chối</span></button>
        <button type="button" className="m3-btn m3-btn-filled m3-btn-sm" onClick={() => decide("approve")} disabled={!!busy}>{busy === "approve" ? <span className="m3-loader sm on-primary" /> : <Icon name="check" size={18} />}<span>Duyệt</span></button>
      </div>
    </div>
  );
}
