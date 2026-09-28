"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatClock } from "@/lib/format";

export interface RequestInfo { pending: { created_at: string | Date } | null; rejected: { note: string | null } | null }

/** Tells the farmer where their change stands: waiting for the operator, or turned down and why. */
export function RequestBanner({ state, lines, onWithdraw }: { state: RequestInfo; lines: string[]; onWithdraw: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  if (state.pending) {
    const at = new Date(state.pending.created_at);
    return (
      <div className="m3-request pending" role="status">
        <Icon name="hourglass_top" filled />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="title-md">Đang chờ quản trị duyệt</p>
          <p className="body-sm" style={{ opacity: 0.85 }}>Gửi lúc {formatClock(at)} ngày {at.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", timeZone: "Asia/Ho_Chi_Minh" })}. Thông tin đang có hiệu lực chưa đổi.</p>
          <ul className="m3-request-list">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
          <button type="button" className="m3-btn m3-btn-text m3-btn-sm" style={{ marginLeft: -12, marginTop: 4 }} disabled={busy} onClick={async () => { setBusy(true); try { await onWithdraw(); } finally { setBusy(false); } }}>
            {busy ? <span className="m3-loader sm" /> : <Icon name="undo" size={18} />}<span>Rút yêu cầu</span>
          </button>
        </div>
      </div>
    );
  }
  if (state.rejected) {
    return (
      <div className="m3-request rejected" role="status">
        <Icon name="error" filled />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="title-md">Yêu cầu trước chưa được duyệt</p>
          <p className="body-sm" style={{ opacity: 0.9 }}>{state.rejected.note ? `Lý do: ${state.rejected.note}` : "Bác liên hệ điều phối để biết thêm."}</p>
        </div>
      </div>
    );
  }
  return null;
}
