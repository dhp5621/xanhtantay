"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

const LIMIT = 1024 ** 3;
const mb = (b: number) => `${(b / 1024 / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`;
interface Usage { configured: boolean; files: number; bytes: number; removed?: number; freed?: number; expiredEvidence?: number; historyRows?: number }

/** How full the 1 GB file store is, with a button to free unused files now. */
export function StorageCard() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async (method: "GET" | "POST") => {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/admin/storage", { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Lỗi ${res.status}`);
      setUsage(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Có lỗi"); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load("GET"); }, []);
  const pct = usage ? Math.min(100, (usage.bytes / LIMIT) * 100) : 0;

  return (
    <section className="m3-card-filled" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}>
      <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="cloud" filled /> Dung lượng lưu trữ</h2><span className="body-sm text-on-surface-variant">Ảnh và video bằng chứng · tối đa 1 GB</span></div>
      {error ? <p className="body-md" style={{ color: "var(--md-error)" }}>{error}</p> : !usage ? <span className="m3-loader sm" /> : !usage.configured ? (
        <p className="body-md text-on-surface-variant">Máy chủ chưa cấu hình kho lưu trữ (BLOB_READ_WRITE_TOKEN), nên chưa nhận được ảnh và video.</p>
      ) : (
        <>
          <p className="headline-sm text-on-surface tabular">{mb(usage.bytes)} <span className="body-md text-on-surface-variant">· {usage.files} tệp · {pct.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%</span></p>
          <div className="m3-bar" style={{ marginTop: 10 }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Dung lượng đã dùng"><span style={{ width: `${pct}%` }} /></div>
          {usage.removed !== undefined && <p className="body-sm text-on-surface-variant" style={{ marginTop: 10 }}><Icon name="task_alt" size={16} /> Đã xoá {usage.removed} tệp không còn dùng ({mb(usage.freed ?? 0)}){usage.expiredEvidence ? ` · gỡ bằng chứng của ${usage.expiredEvidence} yêu cầu đã quá hạn lưu` : ""}{usage.historyRows ? ` · dọn ${usage.historyRows} dòng lịch sử cũ` : ""}.</p>}
        </>
      )}
      <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 14 }}>
        <button type="button" className="m3-btn m3-btn-tonal m3-btn-sm" onClick={() => load("POST")} disabled={busy}>{busy ? <span className="m3-loader sm" /> : <Icon name="cleaning_services" size={18} />}<span>Dọn ngay</span></button>
        <p className="body-sm text-on-surface-variant" style={{ flex: 1, minWidth: 220 }}>Tự dọn mỗi ngày lúc 18h00: tệp tải lên mà không gửi, tệp của yêu cầu đã rút, bằng chứng của yêu cầu đã xử lý quá 60 ngày.</p>
      </div>
    </section>
  );
}
