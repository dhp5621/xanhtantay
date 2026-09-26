"use client";

import { Icon } from "@/components/ui/Icon";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="max-w-6xl mx-auto px-4 py-16 m3-page">
      <div className="m3-empty anim-in-scale">
        <span className="m3-empty-icon" style={{ background: "var(--md-error-container)", color: "var(--md-on-error-container)" }}><Icon name="error" size={40} filled /></span>
        <p className="headline-sm text-on-surface">Có lỗi xảy ra</p>
        <p className="body-md text-on-surface-variant" style={{ maxWidth: 420 }}>
          {process.env.NODE_ENV === "development" ? error.message : "Vui lòng thử lại. Nếu vẫn lỗi, có thể cơ sở dữ liệu chưa được cấu hình."}
        </p>
        <button onClick={reset} className="m3-btn m3-btn-filled" style={{ marginTop: 12 }}><Icon name="refresh" /><span>Thử lại</span></button>
      </div>
    </main>
  );
}
