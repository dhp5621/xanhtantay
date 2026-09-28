"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";
import { REFUND_METHODS } from "@/lib/refund-config";

/** The operator's verdict on one return / refund request, after looking at the evidence. */
export function RefundReview({ id, asked, total }: { id: string; asked: string; total: number }) {
  const [resolution, setResolution] = useState(asked);
  const [amount, setAmount] = useState(total);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const router = useRouter();
  const { show } = useSnackbar();
  const decide = async (action: "approve" | "reject") => {
    if (action === "reject" && !note.trim()) return show("Xin ghi lý do không chấp nhận để báo cho khách", { kind: "error" });
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/refunds/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, resolution, amount, note }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Chưa xử lý được");
      show(action === "approve" ? "Đã chấp nhận. Khách được báo kết quả." : "Đã từ chối. Khách được báo lý do.", { kind: "success" });
      router.refresh();
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error", duration: 6000 }); }
    finally { setBusy(null); }
  };
  return (
    <div className="flex flex-col gap-3" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--md-outline-variant)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="m3-field"><span className="m3-field-label">Cách xử lý</span>
          <div className="m3-button-group" style={{ display: "flex" }}>{REFUND_METHODS.map((m) => <button key={m.value} type="button" className={`m3-seg ${resolution === m.value ? "selected" : ""}`} aria-pressed={resolution === m.value} onClick={() => setResolution(m.value)}>{m.label}</button>)}</div></div>
        {resolution === "refund" && <div className="m3-field"><label className="m3-field-label" htmlFor={`amt-${id}`}>Số tiền hoàn (tối đa {total.toLocaleString("vi-VN")}₫)</label>
          <input id={`amt-${id}`} className="m3-input tabular" type="number" inputMode="numeric" min={1000} max={total} step={1000} value={amount} onChange={(e) => setAmount(Math.min(total, Math.max(0, Math.round(Number(e.target.value)) || 0)))} /></div>}
      </div>
      <input className="m3-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Lời nhắn cho khách (bắt buộc khi từ chối)" aria-label="Lời nhắn cho khách" />
      <div className="flex gap-2 flex-wrap" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="m3-btn m3-btn-outlined m3-btn-sm" onClick={() => decide("reject")} disabled={!!busy}>{busy === "reject" ? <span className="m3-loader sm" /> : <Icon name="close" size={18} />}<span>Không chấp nhận</span></button>
        <button type="button" className="m3-btn m3-btn-filled m3-btn-sm" onClick={() => decide("approve")} disabled={!!busy}>{busy === "approve" ? <span className="m3-loader sm on-primary" /> : <Icon name="check" size={18} />}<span>Chấp nhận</span></button>
      </div>
    </div>
  );
}
