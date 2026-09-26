"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";

const SUGGESTIONS = [
  { icon: "eco", text: "Hôm nay thu hoạch được lứa rau xanh mướt." },
  { icon: "grass", text: "Gieo hạt đợt mới, khoảng 3 tuần nữa có hàng." },
  { icon: "water_drop", text: "Tưới nước buổi sáng, thời tiết thuận lợi cho rau lớn." },
  { icon: "local_florist", text: "Cây đang ra hoa, sắp có trái ngon cho các bạn." },
];

export function DiaryComposer() {
  const [farm, setFarm] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { show } = useSnackbar();

  // The diary API is /api/farms/[id]/diary, so we need the farmer's farm id first.
  useEffect(() => {
    fetch("/api/farms/mine").then(async (r) => setFarm(r.ok ? await r.json() : null)).catch(() => setFarm(null));
  }, []);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).slice(0, 4);
    setFiles(list);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !farm) return;
    setSubmitting(true);
    try {
      const media_urls: string[] = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (up.ok) media_urls.push((await up.json()).url);
        else show("Không tải được ảnh, đăng không kèm ảnh", { kind: "error" });
      }
      const res = await fetch(`/api/farms/${farm.id}/diary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), media_urls }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Không đăng được");
      setDone(true);
      setContent("");
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      show("Đã đăng nhật ký. Khách hàng sẽ thấy ngay trên trang vườn.", { kind: "success" });
      router.refresh();
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      show(err instanceof Error ? err.message : "Có lỗi xảy ra", { kind: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (farm === null) {
    return <p className="body-md text-on-surface-variant">Tài khoản này chưa có vườn nên chưa thể đăng nhật ký.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 anim-in">
      <div className="m3-field">
        <label className="m3-field-label" htmlFor="diary">Nội dung nhật ký</label>
        <textarea id="diary" className="m3-textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Hôm nay ở vườn có gì hay? Chia sẻ cùng khách hàng nhé…" rows={5} maxLength={1000} />
        <p className="body-sm text-on-surface-variant" style={{ textAlign: "right" }}>{content.length}/1000</p>
      </div>

      <div>
        <p className="m3-label" style={{ marginBottom: 8 }}>Gợi ý nhanh</p>
        <div className="flex flex-wrap gap-2 stagger">
          {SUGGESTIONS.map((s) => (
            <button key={s.text} type="button" onClick={() => setContent(s.text)} className="m3-chip">
              <Icon name={s.icon} size={18} /> {s.text}
            </button>
          ))}
        </div>
      </div>

      <div className="m3-field">
        <label className="m3-field-label">Ảnh / video (tối đa 4)</label>
        <label className="m3-card-outlined lift" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 110, cursor: "pointer", gap: 6, borderStyle: "dashed", borderRadius: "var(--shape-xl)", boxShadow: "none", border: "2px dashed var(--md-outline-variant)", background: "var(--md-surface-container)" }}>
          <Icon name="add_a_photo" size={28} className="text-primary" />
          <span className="body-sm text-on-surface-variant">{files.length ? `${files.length} tệp đã chọn` : "Nhấn để chọn ảnh từ máy"}</span>
          <input ref={inputRef} type="file" accept="image/*,video/*" hidden multiple onChange={pick} />
        </label>
        {previews.length > 0 && (
          <div className="flex gap-2 flex-wrap stagger" style={{ marginTop: 8 }}>
            {previews.map((src, i) => (
              <div key={src} style={{ position: "relative" }}>
                {files[i]?.type.startsWith("video") ? (
                  <video src={src} style={{ width: 88, height: 88, objectFit: "cover", borderRadius: "var(--shape-md)" }} muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" style={{ width: 88, height: 88, objectFit: "cover", borderRadius: "var(--shape-md)" }} />
                )}
                <button type="button" className="m3-icon-btn sm filled" style={{ position: "absolute", top: -6, right: -6, background: "var(--md-error)", color: "var(--md-on-error)" }} onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} aria-label="Bỏ ảnh">
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {done && (
        <div className="anim-in-scale m3-chip m3-chip-primary" style={{ height: "auto", padding: "12px 16px", borderRadius: "var(--shape-md)", whiteSpace: "normal" }}>
          <Icon name="check_circle" filled /> Đã đăng nhật ký thành công!
        </div>
      )}

      <button type="submit" disabled={submitting || !content.trim() || !farm} className="m3-btn m3-btn-filled m3-btn-lg" style={{ alignSelf: "flex-start" }}>
        {submitting ? <span className="m3-loader sm on-primary" /> : <Icon name="send" filled />}
        <span>{submitting ? "Đang đăng…" : farm ? `Đăng lên ${farm.name}` : "Đang tải…"}</span>
      </button>
    </form>
  );
}
