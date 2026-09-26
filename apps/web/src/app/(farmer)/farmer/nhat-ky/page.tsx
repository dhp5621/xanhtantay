"use client";

import { useState } from "react";

export default function NhatKyPage() {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);

    await fetch("/api/farms/diary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    setSubmitting(false);
    setDone(true);
    setContent("");
    setTimeout(() => setDone(false), 3000);
  }

  const suggestions = [
    "Hôm nay thu hoạch được lứa rau xanh mướt 🥬",
    "Gieo hạt đợt mới, khoảng 3 tuần nữa có hàng 🌱",
    "Tưới nước buổi sáng, thời tiết thuận lợi cho rau lớn 💧",
    "Cây đang ra hoa, sắp có trái ngon cho các bạn 🌸",
  ];

  return (
    <div className="max-w-2xl">
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--md-on-surface)", marginBottom: 4 }}>
        Đăng nhật ký vườn 📸
      </h1>
      <p style={{ fontSize: 14, color: "var(--md-on-surface-variant)", marginBottom: 28 }}>
        Chia sẻ khoảnh khắc từ vườn để khách hàng tin tưởng hơn
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="m3-label" style={{ display: "block", marginBottom: 6 }}>
            Nội dung nhật ký
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Hôm nay ở vườn có gì hay? Chia sẻ cùng khách hàng nhé..."
            rows={5}
            style={{
              background: "var(--md-surface-container-highest)",
              color: "var(--md-on-surface)",
              border: "none",
              borderBottom: "2px solid var(--md-outline)",
              borderRadius: "var(--radius-md) var(--radius-md) 0 0",
              padding: "14px",
              fontSize: 15,
              fontFamily: "inherit",
              width: "100%",
              outline: "none",
              resize: "vertical",
              transition: "border-color .2s",
            }}
            onFocus={(e) => (e.target.style.borderBottomColor = "var(--md-primary)")}
            onBlur={(e) => (e.target.style.borderBottomColor = "var(--md-outline)")}
          />
        </div>

        <div>
          <p className="m3-label" style={{ marginBottom: 8 }}>Gợi ý nhanh</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setContent(s)}
                className="m3-chip"
                style={{ cursor: "pointer", border: "1px solid var(--md-outline-variant)" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="m3-label" style={{ display: "block", marginBottom: 6 }}>
            Thêm ảnh / video
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 100,
              background: "var(--md-surface-container)",
              borderRadius: "var(--radius-lg)",
              border: "2px dashed var(--md-outline-variant)",
              cursor: "pointer",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 24 }}>📷</span>
            <span style={{ fontSize: 13, color: "var(--md-on-surface-variant)" }}>
              Nhấn để chọn ảnh từ máy
            </span>
            <input type="file" accept="image/*,video/*" hidden multiple />
          </label>
        </div>

        {done && (
          <div
            style={{
              background: "var(--md-primary-container)",
              color: "var(--md-on-primary-container)",
              borderRadius: "var(--radius-md)",
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            ✅ Đã đăng nhật ký thành công!
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="m3-filled-button"
          style={{ alignSelf: "flex-start", padding: "12px 28px", fontSize: 15 }}
        >
          {submitting ? "Đang đăng..." : "📮 Đăng nhật ký"}
        </button>
      </form>
    </div>
  );
}
