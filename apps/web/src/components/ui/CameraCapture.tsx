"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Portal } from "./Portal";
import { Icon } from "./Icon";

type Mode = "photo" | "video";
type Facing = "user" | "environment";

const DEFAULT_MAX_SECONDS = 30;
const VIDEO_BITRATE = 1_200_000;
const AUDIO_BITRATE = 64_000;

export function hasCameraApi() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

function pickMime(): string | null {
  const c = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return c.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? null;
}

/**
 * In-app camera (MediaDevices API). Photo: canvas frame → WebP. Video: MediaRecorder at
 * ≤720p / 30 fps / ~1.2 Mbps, auto-stops at 30 s. Renders full-screen through a portal.
 */
export function CameraCapture({
  modes = ["photo"],
  initialFacing = "environment",
  onCapture,
  onClose,
  title,
  maxSeconds: VIDEO_MAX_SECONDS = DEFAULT_MAX_SECONDS,
}: {
  modes?: Mode[];
  initialFacing?: Facing;
  onCapture: (file: File, kind: Mode) => void;
  onClose: () => void;
  title?: string;
  /** Recording stops by itself after this long. */
  maxSeconds?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [mode, setMode] = useState<Mode>(modes[0]);
  const [facing, setFacing] = useState<Facing>(initialFacing);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canFlip, setCanFlip] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [closing, setClosing] = useState(false);
  const [review, setReview] = useState<{ file: File; url: string; kind: Mode } | null>(null);
  const [flash, setFlash] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    stopStream();
    setReady(false);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
        audio: mode === "video",
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setReady(true);
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      setCanFlip(devices.filter((d) => d.kind === "videoinput").length > 1);
    } catch (e) {
      const name = (e as { name?: string })?.name;
      setError(name === "NotAllowedError" ? "Bạn chưa cho phép dùng camera. Mở cài đặt trình duyệt để bật lại." : "Không mở được camera trên thiết bị này.");
    }
  }, [facing, mode, stopStream]);

  useEffect(() => { if (!review) void start(); return stopStream; }, [start, stopStream, review]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (recording) stopRecording();
    stopStream();
    setClosing(true);
    setTimeout(onClose, 220);
  };

  const takePhoto = async () => {
    const v = videoRef.current;
    if (!v || !ready) return;
    setFlash(true); setTimeout(() => setFlash(false), 180);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext("2d")!;
    if (facing === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); } // save what the mirrored preview showed
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.8));
    const out = blob ?? (await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85)));
    if (!out) return;
    const file = new File([out], `anh-${Date.now()}.${out.type === "image/webp" ? "webp" : "jpg"}`, { type: out.type });
    stopStream();
    setReview({ file, url: URL.createObjectURL(file), kind: "photo" });
  };

  const startRecording = () => {
    const stream = streamRef.current;
    const mime = pickMime();
    if (!stream || !mime) { setError("Trình duyệt này không quay video được, hãy dùng “Chọn từ máy”."); return; }
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: AUDIO_BITRATE });
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime.split(";")[0] });
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `video-${Date.now()}.${ext}`, { type: blob.type });
      stopStream();
      setReview({ file, url: URL.createObjectURL(file), kind: "video" });
    };
    recRef.current = rec;
    rec.start(250);
    setRecording(true);
    setElapsed(0);
    const t0 = Date.now();
    timerRef.current = window.setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      setElapsed(s);
      if (s >= VIDEO_MAX_SECONDS) stopRecording();
    }, 100);
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
  };

  const accept = () => {
    if (!review) return;
    onCapture(review.file, review.kind);
    URL.revokeObjectURL(review.url);
    setClosing(true);
    setTimeout(onClose, 220);
  };

  const retake = () => {
    if (review) URL.revokeObjectURL(review.url);
    setReview(null);
  };

  const progress = Math.min(1, elapsed / VIDEO_MAX_SECONDS);
  const ringR = 34, ringC = 2 * Math.PI * ringR;

  return (
    <Portal>
      <div className={`m3-scrim ${closing ? "closing" : ""}`} style={{ background: "#000", zIndex: 200 }} aria-hidden />
      <section className={`m3-camera ${closing ? "closing" : ""}`} role="dialog" aria-modal="true" aria-label={title ?? "Camera"}>
        {/* Top bar */}
        <div className="m3-camera-top">
          <button className="m3-icon-btn" onClick={close} aria-label="Đóng" style={{ color: "#fff" }}><Icon name="close" /></button>
          <span className="title-md" style={{ color: "#fff", flex: 1, textAlign: "center" }}>{review ? (review.kind === "video" ? "Xem lại video" : "Xem lại ảnh") : title ?? (mode === "video" ? "Quay video" : "Chụp ảnh")}</span>
          {!review && canFlip ? (
            <button className="m3-icon-btn" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} aria-label="Đổi camera" disabled={recording} style={{ color: "#fff" }}><Icon name="cameraswitch" /></button>
          ) : <span style={{ width: 40 }} />}
        </div>

        {/* Viewfinder / review */}
        <div className="m3-camera-view">
          {review ? (
            review.kind === "video"
              ? <video src={review.url} controls autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={review.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: facing === "user" ? "scaleX(-1)" : undefined, opacity: ready ? 1 : 0, transition: "opacity .3s" }} />
              {!ready && !error && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><span className="m3-loader on-primary" style={{ width: 40, height: 40 }} /></div>}
              {error && (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "#fff" }}>
                  <div>
                    <Icon name="videocam_off" size={48} />
                    <p className="body-md" style={{ marginTop: 8 }}>{error}</p>
                  </div>
                </div>
              )}
              {flash && <div style={{ position: "absolute", inset: 0, background: "#fff", animation: "m3-fade-out .18s both" }} />}
              {recording && (
                <span className="m3-chip sm round anim-in-scale" style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", background: "var(--md-error)", color: "var(--md-on-error)", boxShadow: "none" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: "#fff", animation: "m3-blink 1s infinite" }} /> {elapsed.toFixed(0)}s / {VIDEO_MAX_SECONDS}s
                </span>
              )}
            </>
          )}
        </div>

        {/* Bottom controls */}
        <div className="m3-camera-bottom">
          {review ? (
            <div style={{ display: "flex", gap: 12, justifyContent: "center", width: "100%" }}>
              <button className="m3-btn m3-btn-lg" onClick={retake} style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}><Icon name="replay" /><span>Chụp lại</span></button>
              <button className="m3-btn m3-btn-filled m3-btn-lg" onClick={accept}><Icon name="check" /><span>{review.kind === "video" ? "Dùng video này" : "Dùng ảnh này"}</span></button>
            </div>
          ) : (
            <>
              {modes.length > 1 && (
                <div className="m3-button-group" style={{ marginBottom: 18 }}>
                  {modes.map((m) => (
                    <button key={m} type="button" className={`m3-seg ${mode === m ? "selected" : ""}`} onClick={() => setMode(m)} disabled={recording} style={mode === m ? undefined : { background: "rgba(255,255,255,.14)", color: "#fff" }}>
                      <Icon name={m === "photo" ? "photo_camera" : "videocam"} size={18} /> {m === "photo" ? "Ảnh" : "Video"}
                    </button>
                  ))}
                </div>
              )}
              <button
                className={`m3-shutter ${recording ? "recording" : ""} ${mode === "video" ? "video" : ""}`}
                onClick={mode === "photo" ? takePhoto : recording ? stopRecording : startRecording}
                disabled={!ready}
                aria-label={mode === "photo" ? "Chụp" : recording ? "Dừng quay" : "Bắt đầu quay"}
              >
                {mode === "video" && (
                  <svg className="m3-shutter-ring" viewBox="0 0 80 80" aria-hidden>
                    <circle cx="40" cy="40" r={ringR} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="4" />
                    <circle cx="40" cy="40" r={ringR} fill="none" stroke="var(--md-error)" strokeWidth="4" strokeLinecap="round" strokeDasharray={ringC} strokeDashoffset={ringC * (1 - progress)} transform="rotate(-90 40 40)" />
                  </svg>
                )}
                <span className="m3-shutter-core" />
              </button>
              <p className="body-sm" style={{ color: "rgba(255,255,255,.7)", marginTop: 12 }}>
                {mode === "photo" ? "Ảnh được nén còn ≤1280px" : recording ? "Chạm để dừng" : `Tối đa ${VIDEO_MAX_SECONDS} giây · 720p · 30fps`}
              </p>
            </>
          )}
        </div>
      </section>
    </Portal>
  );
}
