"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { WebPushToggle } from "@/components/WebPushToggle";

type Target = "mobile" | "web" | "all";
interface Result { mobile: { sent: number; failed: number }; web: { sent: number; failed: number }; removed: number; webConfigured: boolean }

const TARGETS: { value: Target; label: string; icon: string }[] = [
  { value: "mobile", label: "Điện thoại", icon: "smartphone" },
  { value: "web", label: "Trình duyệt", icon: "web" },
  { value: "all", label: "Tất cả", icon: "devices" },
];

/** Admin dashboard card: broadcast a custom push notification to all phones and/or all browsers. */
export function AdminPush({ counts }: { counts: { mobile: number; web: number } }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<Target>("mobile");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const reach = target === "mobile" ? counts.mobile : target === "web" ? counts.web : counts.mobile + counts.web;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body, target }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Lỗi ${res.status}`);
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <section>
      <div className="m3-section-head">
        <h2 className="title-lg text-on-surface"><Icon name="notifications_active" filled /> Thông báo đẩy</h2>
      </div>
      <form onSubmit={send} className="m3-card m3-card-filled flex flex-col gap-4" style={{ padding: 20 }}>
        <div className="m3-button-group" role="radiogroup" aria-label="Gửi tới">
          {TARGETS.map((t) => (
            <button key={t.value} type="button" role="radio" aria-checked={target === t.value} className={`m3-seg ${target === t.value ? "selected" : ""}`} onClick={() => setTarget(t.value)}>
              <Icon name={target === t.value ? "check" : t.icon} size={18} /> {t.label}
            </button>
          ))}
        </div>
        <p className="body-sm text-on-surface-variant">
          Đang có {counts.mobile} điện thoại và {counts.web} trình duyệt đăng ký · lần này gửi tới {reach} thiết bị.
        </p>
        <div className="m3-field">
          <label className="m3-field-label" htmlFor="push-title">Tiêu đề</label>
          <input id="push-title" className="m3-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Rau mới về hôm nay!" required />
        </div>
        <div className="m3-field">
          <label className="m3-field-label" htmlFor="push-body">Nội dung</label>
          <textarea id="push-body" className="m3-textarea" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} placeholder="Các vườn vừa cập nhật lứa rau mới, vào xem ngay nhé." required />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="submit" className="m3-btn m3-btn-filled" disabled={sending || !title.trim() || !body.trim()}>
            {sending ? <span className="m3-loader sm on-primary" /> : <Icon name="send" size={18} />}<span>Gửi thông báo</span>
          </button>
          {error && <span className="body-sm" style={{ color: "var(--md-error)" }}>{error}</span>}
          {result && (
            <span className="body-sm text-on-surface-variant">
              <Icon name="task_alt" size={16} /> Điện thoại: {result.mobile.sent} đã gửi{result.mobile.failed ? `, ${result.mobile.failed} lỗi` : ""} · Trình duyệt: {result.webConfigured ? `${result.web.sent} đã gửi${result.web.failed ? `, ${result.web.failed} lỗi` : ""}` : "chưa cấu hình VAPID"} · Máy chưa đăng ký đẩy sẽ nhận trong 15 giây khi đang mở app hoặc trang
              {result.removed ? ` · đã xoá ${result.removed} thiết bị hết hạn` : ""}
            </span>
          )}
        </div>
        <div style={{ borderTop: "1px solid var(--md-outline-variant)", paddingTop: 16 }}>
          <WebPushToggle small />
        </div>
      </form>
    </section>
  );
}
