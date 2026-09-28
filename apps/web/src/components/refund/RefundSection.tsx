"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CameraCapture, hasCameraApi } from "@/components/ui/CameraCapture";
import { canCompressVideo, compressImage, compressVideo, getVideoDuration } from "@/lib/media";
import { formatVND } from "@/lib/format";
import { countWords, evidenceRequired, methodLabel, reasonLabel, REFUND_MAX_WORDS, REFUND_METHODS, REFUND_PHOTOS, REFUND_REASONS, REFUND_STATUS, REFUND_VIDEO_SECONDS } from "@/lib/refund-config";
import { Evidence } from "./Evidence";

export interface RefundView { id: string; reason: string; description: string; photos: string[]; video_url: string | null; method: string; status: string; resolution: string | null; refund_amount: number | null; note: string | null }
interface Picked { file: File; url: string }
const SLOTS = ["Mặt trước", "Mặt sau", "Bên trong", "Chỗ có vấn đề"];

/** "Trả hàng / Hoàn tiền" on a delivered order: the request form, or the state of the request already sent. */
export function RefundSection({ orderId, initial, canRequest, until, blocked }: { orderId: string; initial: RefundView | null; canRequest: boolean; until: string | null; blocked: string | null }) {
  const [request, setRequest] = useState(initial);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("refund");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<(Picked | null)[]>(() => SLOTS.map(() => null));
  const [video, setVideo] = useState<(Picked & { seconds: number }) | null>(null);
  const [camera, setCamera] = useState<{ slot: number } | "video" | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = useRef<HTMLInputElement>(null);
  const pickVideo = useRef<HTMLInputElement>(null);
  const slot = useRef(0);
  const router = useRouter();
  const { show } = useSnackbar();

  // Previews are object URLs: release them when the form goes away.
  const live = useRef<string[]>([]);
  useEffect(() => () => live.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const preview = (f: File) => { const u = URL.createObjectURL(f); live.current.push(u); return u; };

  const addPhoto = async (i: number, file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return show("Xin chọn một tấm ảnh giúp ạ", { kind: "error" });
    setStatus("Đang nén ảnh…");
    const small = await compressImage(file);
    setPhotos((p) => p.map((x, k) => (k === i ? { file: small, url: preview(small) } : x)));
    setStatus("");
  };
  const addVideo = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) return show("Xin chọn một video giúp ạ", { kind: "error" });
    const seconds = await getVideoDuration(file);
    if (Number.isFinite(seconds) && seconds > REFUND_VIDEO_SECONDS + 1 && !canCompressVideo()) return show(`Video dài ${Math.round(seconds)} giây. Xin chọn video tối đa ${REFUND_VIDEO_SECONDS} giây giúp ạ`, { kind: "error", duration: 6000 });
    let out = file;
    if (canCompressVideo()) {
      try { out = await compressVideo(file, (p) => setStatus(`Đang nén video… ${Math.round(p * 100)}%`), REFUND_VIDEO_SECONDS); }
      catch { out = file; }
    }
    setStatus("");
    setVideo({ file: out, url: preview(out), seconds: Math.min(Number.isFinite(seconds) ? seconds : REFUND_VIDEO_SECONDS, REFUND_VIDEO_SECONDS) });
    if (Number.isFinite(seconds) && seconds > REFUND_VIDEO_SECONDS + 1) show(`Video dài ${Math.round(seconds)} giây nên chỉ giữ ${REFUND_VIDEO_SECONDS} giây đầu`, { kind: "info", duration: 6000 });
  };

  const words = countWords(description);
  const need = evidenceRequired(reason);
  const havePhotos = photos.filter(Boolean).length;
  const missing = [
    !reason && "lý do",
    words < 3 && "mô tả",
    need && havePhotos < REFUND_PHOTOS && `${REFUND_PHOTOS - havePhotos} ảnh`,
    need && !video && "1 video",
  ].filter(Boolean) as string[];
  const valid = !missing.length && words <= REFUND_MAX_WORDS;

  const upload = async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    body.append("purpose", "refund");
    const res = await fetch("/api/upload", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Chưa tải được ảnh / video lên");
    return data.url as string;
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      const chosen = photos.filter((p): p is Picked => !!p);
      const urls: string[] = [];
      for (const [i, p] of chosen.entries()) { setStatus(`Đang tải ảnh ${i + 1}/${chosen.length}…`); urls.push(await upload(p.file)); }
      let videoUrl: string | null = null;
      if (video) { setStatus("Đang tải video…"); videoUrl = await upload(video.file); }
      setStatus("Đang gửi yêu cầu…");
      const res = await fetch(`/api/orders/${orderId}/refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, description, photos: urls, video_url: videoUrl, method }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Chưa gửi được yêu cầu");
      setRequest(data.request);
      setOpen(false);
      show("Đã gửi yêu cầu. Chúng tôi sẽ xác minh và báo lại cho bạn ạ.", { kind: "success", duration: 7000 });
      router.refresh();
    } catch (err) { show(err instanceof Error ? err.message : "Có lỗi", { kind: "error", duration: 7000 }); }
    finally { setBusy(false); setStatus(""); }
  };
  const withdraw = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/refund`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Chưa rút được yêu cầu");
      setRequest(null);
      show("Đã rút yêu cầu", { kind: "success" });
      router.refresh();
    } catch (err) { show(err instanceof Error ? err.message : "Có lỗi", { kind: "error" }); }
    finally { setBusy(false); }
  };

  if (request) {
    const s = REFUND_STATUS[request.status] ?? REFUND_STATUS.pending;
    return (
      <section className="m3-card-filled" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}>
        <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="assignment_return" filled /> Trả hàng / Hoàn tiền</h2><span className={`m3-chip sm round ${request.status === "approved" ? "m3-chip-primary" : request.status === "rejected" ? "m3-chip-error" : "m3-chip-tertiary"}`}><Icon name={s.icon} size={14} filled /> {s.label}</span></div>
        <dl className="m3-diff" style={{ marginBottom: 14 }}>
          <div style={{ display: "contents" }}><dt>Lý do</dt><dd>{reasonLabel(request.reason)}</dd></div>
          <div style={{ display: "contents" }}><dt>Mô tả</dt><dd style={{ whiteSpace: "pre-wrap" }}>{request.description}</dd></div>
          <div style={{ display: "contents" }}><dt>Mong muốn</dt><dd>{methodLabel(request.method)}</dd></div>
          {request.status === "approved" && <div style={{ display: "contents" }}><dt>Kết quả</dt><dd><ins>{methodLabel(request.resolution)}{request.refund_amount ? ` ${formatVND(request.refund_amount)}` : ""}</ins></dd></div>}
          {request.note && <div style={{ display: "contents" }}><dt>{request.status === "rejected" ? "Lý do" : "Ghi chú"}</dt><dd>{request.note}</dd></div>}
        </dl>
        <Evidence photos={request.photos} video={request.video_url} />
        {request.status === "pending" && (
          <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 14 }}>
            <p className="body-sm text-on-surface-variant" style={{ flex: 1, minWidth: 200 }}>Chúng tôi đang xác minh và sẽ báo lại cho bạn ạ.</p>
            <button type="button" className="m3-btn m3-btn-text m3-btn-sm" onClick={withdraw} disabled={busy}>{busy ? <span className="m3-loader sm" /> : <Icon name="undo" size={18} />}<span>Rút yêu cầu</span></button>
          </div>
        )}
      </section>
    );
  }
  if (!canRequest) return blocked ? <p className="body-sm text-on-surface-variant"><Icon name="info" size={14} /> {blocked}</p> : null;

  return (
    <section className="m3-card-filled" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}>
      <div className="flex items-center gap-4 flex-wrap">
        <span className="m3-list-leading"><Icon name="assignment_return" filled /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 className="title-lg text-on-surface">Hộp rau chưa như ý?</h2>
          <p className="body-sm text-on-surface-variant">Gửi yêu cầu trả hàng / hoàn tiền kèm ảnh và video.{until ? ` Gửi được đến hết ${new Date(until).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", timeZone: "Asia/Ho_Chi_Minh" })}.` : ""}</p>
        </div>
        <button type="button" className="m3-btn m3-btn-tonal-primary" onClick={() => setOpen(true)}><Icon name="assignment_return" size={18} /><span>Gửi yêu cầu</span></button>
      </div>

      {open && (
        <Portal>
          <div className="m3-scrim" onClick={() => !busy && setOpen(false)} aria-hidden />
          <form className="m3-dialog m3-refund-dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="rf-title">
            <h2 id="rf-title" className="headline-sm" style={{ marginBottom: 4 }}>Trả hàng / Hoàn tiền</h2>
            <p className="body-sm text-on-surface-variant" style={{ marginBottom: 16 }}>Chúng tôi sẽ xác minh rồi báo lại cho bạn.</p>
            <div className="flex flex-col gap-4">
              <fieldset className="m3-field" style={{ border: "none", padding: 0, margin: 0 }}>
                <legend className="m3-field-label">Lý do</legend>
                <div className="flex flex-col gap-2" role="radiogroup">
                  {REFUND_REASONS.map((r) => (
                    <button key={r.value} type="button" role="radio" aria-checked={reason === r.value} className={`m3-chip ${reason === r.value ? "selected" : ""}`} style={{ justifyContent: "flex-start", height: 44 }} onClick={() => setReason(r.value)}>
                      <Icon name={reason === r.value ? "radio_button_checked" : "radio_button_unchecked"} size={18} /> {r.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="m3-field"><label className="m3-field-label" htmlFor="rf-desc">Mô tả chi tiết</label>
                <textarea id="rf-desc" className="m3-textarea" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Trường hợp của bạn thế nào? Ví dụ: mở hộp ra thì bắp cải bị dập một nửa, cà chua vỡ…" aria-describedby="rf-words" />
                <span id="rf-words" className="body-sm tabular" style={{ alignSelf: "flex-end", color: words > REFUND_MAX_WORDS ? "var(--md-error)" : "var(--md-on-surface-variant)" }}>{words}/{REFUND_MAX_WORDS} từ</span></div>

              <div className="m3-field">
                <span className="m3-field-label">Hình ảnh / video bằng chứng</span>
                <p className="body-sm text-on-surface-variant" style={{ marginBottom: 8 }}>{need ? `Bắt buộc: ${REFUND_PHOTOS} ảnh chụp đủ các góc của hộp rau và 1 video (tối đa ${REFUND_VIDEO_SECONDS} giây).` : "Chưa nhận được hàng thì không bắt buộc ảnh hay video. Có ảnh sảnh hoặc tủ nhận hàng thì càng dễ xác minh."} Ảnh và video được nén trước khi gửi.</p>
                <input ref={pick} type="file" accept="image/*" hidden onChange={(e) => { void addPhoto(slot.current, e.target.files?.[0]); e.target.value = ""; }} />
                <input ref={pickVideo} type="file" accept="video/*" hidden onChange={(e) => { void addVideo(e.target.files?.[0]); e.target.value = ""; }} />
                <div className="m3-refund-slots">
                  {SLOTS.map((label, i) => (
                    <div key={label} className="m3-refund-slot">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <div className="m3-refund-thumb">{photos[i] ? <img src={photos[i]!.url} alt={label} /> : <Icon name="add_a_photo" />}</div>
                      <span className="label-md">{label}</span>
                      <div className="flex gap-1 flex-wrap" style={{ justifyContent: "center" }}>
                        {hasCameraApi() && <button type="button" className="m3-btn m3-btn-text m3-btn-sm" onClick={() => setCamera({ slot: i })} disabled={busy}>Chụp</button>}
                        <button type="button" className="m3-btn m3-btn-text m3-btn-sm" onClick={() => { slot.current = i; pick.current?.click(); }} disabled={busy}>Chọn</button>
                        {photos[i] && <button type="button" className="m3-btn m3-btn-text m3-btn-sm" onClick={() => setPhotos((p) => p.map((x, k) => (k === i ? null : x)))} disabled={busy} aria-label={`Bỏ ảnh ${label}`}>Bỏ</button>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="m3-refund-video">
                  <div className="m3-refund-thumb wide">{video ? <video src={video.url} controls playsInline preload="metadata" /> : <Icon name="videocam" />}</div>
                  <div className="flex flex-col gap-1" style={{ minWidth: 0 }}>
                    <span className="label-md">Video hộp rau{video ? ` · ${Math.round(video.seconds)} giây` : ` (tối đa ${REFUND_VIDEO_SECONDS} giây)`}</span>
                    <div className="flex gap-1 flex-wrap">
                      {hasCameraApi() && <button type="button" className="m3-btn m3-btn-text m3-btn-sm" onClick={() => setCamera("video")} disabled={busy}>Quay video</button>}
                      <button type="button" className="m3-btn m3-btn-text m3-btn-sm" onClick={() => pickVideo.current?.click()} disabled={busy}>Chọn</button>
                      {video && <button type="button" className="m3-btn m3-btn-text m3-btn-sm" onClick={() => setVideo(null)} disabled={busy}>Bỏ</button>}
                    </div>
                  </div>
                </div>
              </div>

              <fieldset className="m3-field" style={{ border: "none", padding: 0, margin: 0 }}>
                <legend className="m3-field-label">Cách xử lý mong muốn</legend>
                <div className="m3-button-group" style={{ display: "flex" }} role="radiogroup">
                  {REFUND_METHODS.map((m) => <button key={m.value} type="button" role="radio" aria-checked={method === m.value} className={`m3-seg ${method === m.value ? "selected" : ""}`} onClick={() => setMethod(m.value)} title={m.hint}>{m.label}</button>)}
                </div>
                <p className="body-sm text-on-surface-variant" style={{ marginTop: 6 }}>Cách xử lý cuối cùng tuỳ theo tình trạng hộp rau sau khi chúng tôi xác minh.</p>
              </fieldset>
            </div>
            <p className="body-sm" style={{ marginTop: 14, minHeight: 20, color: "var(--md-on-surface-variant)" }} aria-live="polite">{status || (missing.length ? `Còn thiếu ${missing.join(", ")}` : words > REFUND_MAX_WORDS ? `Mô tả đang dài hơn ${REFUND_MAX_WORDS} từ` : "")}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button type="button" className="m3-btn m3-btn-text" onClick={() => setOpen(false)} disabled={busy}>Để sau</button>
              <button type="submit" className="m3-btn m3-btn-filled" disabled={!valid || busy || !!status && !busy}>{busy ? <span className="m3-loader sm on-primary" /> : <Icon name="send" size={18} />}<span>Gửi yêu cầu</span></button>
            </div>
          </form>
          {camera && (
            <CameraCapture
              modes={camera === "video" ? ["video"] : ["photo"]}
              maxSeconds={REFUND_VIDEO_SECONDS}
              initialFacing="environment"
              title={camera === "video" ? "Quay video hộp rau" : `Chụp ảnh: ${SLOTS[camera.slot]}`}
              onClose={() => setCamera(null)}
              onCapture={(f, kind) => { const c = camera; setCamera(null); if (kind === "video" || c === "video") void addVideo(f); else void addPhoto(c.slot, f); }}
            />
          )}
        </Portal>
      )}
    </section>
  );
}
