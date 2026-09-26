"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";
import { compressImage, compressVideo, canCompressVideo, getVideoDuration, VIDEO_MAX_SECONDS } from "@/lib/media";

const SUGGESTIONS = [
  { icon: "eco", text: "Hôm nay thu hoạch được lứa rau xanh mướt." },
  { icon: "grass", text: "Gieo hạt đợt mới, khoảng 3 tuần nữa có hàng." },
  { icon: "water_drop", text: "Tưới nước buổi sáng, thời tiết thuận lợi cho rau lớn." },
  { icon: "local_florist", text: "Cây đang ra hoa, sắp có trái ngon cho các bạn." },
];
const MAX_FILES = 4;

interface Media { file: File; url: string; kind: "image" | "video"; originalSize: number }

const fmtMB = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

export function DiaryComposer() {
  const [farm, setFarm] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<Media[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { show } = useSnackbar();

  useEffect(() => {
    fetch("/api/farms/mine").then(async (r) => setFarm(r.ok ? await r.json() : null)).catch(() => setFarm(null));
  }, []);

  useEffect(() => () => media.forEach((m) => URL.revokeObjectURL(m.url)), [media]);

  /** Compress each picked/captured file before it is added to the post. */
  const ingest = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list).slice(0, MAX_FILES - media.length);
    if (files.length < list.length) show(`Tối đa ${MAX_FILES} tệp mỗi bài`, { kind: "info" });
    for (const f of files) {
      try {
        if (f.type.startsWith("video/")) {
          const dur = await getVideoDuration(f);
          if (canCompressVideo()) {
            setProcessing(`Đang nén video (${Math.min(dur || 0, VIDEO_MAX_SECONDS).toFixed(0)}s, 720p · 25fps)… 0%`);
            const out = await compressVideo(f, (p) => setProcessing(`Đang nén video… ${Math.round(p * 100)}%`));
            if (dur > VIDEO_MAX_SECONDS) show(`Video đã được cắt còn ${VIDEO_MAX_SECONDS} giây`, { kind: "info" });
            setMedia((m) => [...m, { file: out, url: URL.createObjectURL(out), kind: "video", originalSize: f.size }]);
          } else {
            if (dur > VIDEO_MAX_SECONDS) { show(`Video phải dưới ${VIDEO_MAX_SECONDS} giây (trình duyệt này không nén được)`, { kind: "error" }); continue; }
            setMedia((m) => [...m, { file: f, url: URL.createObjectURL(f), kind: "video", originalSize: f.size }]);
          }
        } else if (f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name)) {
          setProcessing("Đang nén ảnh…");
          const out = await compressImage(f);
          setMedia((m) => [...m, { file: out, url: URL.createObjectURL(out), kind: "image", originalSize: f.size }]);
        } else {
          show(`Không hỗ trợ tệp ${f.name}`, { kind: "error" });
        }
      } catch {
        show(`Không xử lý được ${f.name}`, { kind: "error" });
      } finally {
        setProcessing(null);
      }
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => { void ingest(e.target.files); e.target.value = ""; };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !farm) return;
    setSubmitting(true);
    try {
      const media_urls: string[] = [];
      for (const m of media) {
        const fd = new FormData();
        fd.append("file", m.file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (up.ok) media_urls.push((await up.json()).url);
        else show(`Không tải được ${m.kind === "video" ? "video" : "ảnh"}: ${(await up.json().catch(() => ({})))?.error ?? "lỗi"}`, { kind: "error" });
      }
      const res = await fetch(`/api/farms/${farm.id}/diary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), media_urls }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Không đăng được");
      setDone(true);
      setContent("");
      setMedia([]);
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

  const totalSize = media.reduce((s, m) => s + m.file.size, 0);
  const saved = media.reduce((s, m) => s + (m.originalSize - m.file.size), 0);
  const full = media.length >= MAX_FILES;

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
        <label className="m3-field-label">Ảnh / video (tối đa {MAX_FILES}, video ≤ {VIDEO_MAX_SECONDS}s)</label>

        {/* Hidden inputs: gallery picker, camera photo, camera video */}
        <input ref={pickRef} type="file" accept="image/*,video/*" hidden multiple onChange={onPick} />
        <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
        <input ref={videoRef} type="file" accept="video/*" capture="environment" hidden onChange={onPick} />

        <div className="grid grid-cols-3 gap-2">
          {[
            { ref: photoRef, icon: "photo_camera", label: "Chụp ảnh", hint: "Mở camera" },
            { ref: videoRef, icon: "videocam", label: "Quay video", hint: `Tối đa ${VIDEO_MAX_SECONDS}s` },
            { ref: pickRef, icon: "add_photo_alternate", label: "Chọn từ máy", hint: "Ảnh hoặc video" },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              disabled={full || !!processing}
              onClick={() => b.ref.current?.click()}
              className="m3-card-outlined lift"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 96, gap: 4, borderRadius: "var(--shape-xl)", boxShadow: "none", border: "2px dashed var(--md-outline-variant)", background: "var(--md-surface-container)", cursor: full ? "not-allowed" : "pointer", opacity: full ? 0.5 : 1 }}
            >
              <Icon name={b.icon} size={28} className="text-primary" filled />
              <span className="title-sm text-on-surface">{b.label}</span>
              <span className="body-sm text-on-surface-variant">{b.hint}</span>
            </button>
          ))}
        </div>

        {processing && (
          <div className="anim-in" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <span className="m3-loader sm" />
            <span className="body-sm text-on-surface-variant">{processing}</span>
          </div>
        )}

        {media.length > 0 && (
          <>
            <div className="flex gap-2 flex-wrap stagger" style={{ marginTop: 8 }}>
              {media.map((m, i) => (
                <div key={m.url} style={{ position: "relative" }}>
                  {m.kind === "video" ? (
                    <video src={m.url} style={{ width: 96, height: 96, objectFit: "cover", borderRadius: "var(--shape-md)", background: "#000" }} muted playsInline controls={false} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: "var(--shape-md)" }} />
                  )}
                  <span className="m3-chip sm round" style={{ position: "absolute", left: 4, bottom: 4, height: 20, fontSize: 10, padding: "0 6px", background: "rgba(0,0,0,.6)", color: "#fff", boxShadow: "none" }}>
                    {m.kind === "video" && <Icon name="videocam" size={12} filled />} {fmtMB(m.file.size)}
                  </span>
                  <button type="button" className="m3-icon-btn sm filled" style={{ position: "absolute", top: -6, right: -6, background: "var(--md-error)", color: "var(--md-on-error)" }} onClick={() => setMedia((ms) => ms.filter((_, j) => j !== i))} aria-label="Bỏ tệp">
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ))}
            </div>
            <p className="body-sm text-on-surface-variant" style={{ marginTop: 6 }}>
              Sẽ tải lên {fmtMB(totalSize)}{saved > 0 ? ` · đã nén tiết kiệm ${fmtMB(saved)}` : ""}
            </p>
          </>
        )}
      </div>

      {done && (
        <div className="anim-in-scale m3-chip m3-chip-primary" style={{ height: "auto", padding: "12px 16px", borderRadius: "var(--shape-md)", whiteSpace: "normal" }}>
          <Icon name="check_circle" filled /> Đã đăng nhật ký thành công!
        </div>
      )}

      <button type="submit" disabled={submitting || !!processing || !content.trim() || !farm} className="m3-btn m3-btn-filled m3-btn-lg" style={{ alignSelf: "flex-start" }}>
        {submitting ? <span className="m3-loader sm on-primary" /> : <Icon name="send" filled />}
        <span>{submitting ? "Đang đăng…" : farm ? `Đăng lên ${farm.name}` : "Đang tải…"}</span>
      </button>
    </form>
  );
}
