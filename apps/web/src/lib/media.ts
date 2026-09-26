"use client";

/**
 * Client-side media compression so the 1 GB Blob store lasts.
 * Images  → max 1280px on the long edge, WebP q0.72 (≈150–300 KB from a phone photo).
 * Videos  → max 720p, 25 fps, ~1.2 Mbps, cut at 30 s (≈4–5 MB max) via canvas + MediaRecorder.
 * Avatars → 96×96 WebP q0.7 as a data URL (≈3–5 KB) stored straight in the database.
 */

export const VIDEO_MAX_SECONDS = 30;
const IMAGE_MAX_EDGE = 1280;
const VIDEO_MAX_EDGE = 1280; // 720p landscape / portrait
const VIDEO_FPS = 25;
const VIDEO_BITRATE = 1_200_000;
const AUDIO_BITRATE = 64_000;

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    // HEIC or other formats the bitmap API cannot decode: try an <img>.
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
      img.src = url;
    });
  }
}

function drawScaled(src: ImageBitmap | HTMLImageElement, maxEdge: number, cover?: number) {
  const w = "naturalWidth" in src ? src.naturalWidth : src.width;
  const h = "naturalHeight" in src ? src.naturalHeight : src.height;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  if (cover) {
    // Square center-crop (avatars)
    const side = Math.min(w, h);
    canvas.width = cover; canvas.height = cover;
    ctx.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, cover, cover);
  } else {
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), type, quality));
}

/** Returns a smaller WebP (or JPEG fallback) File; returns the original if anything fails. */
export async function compressImage(file: File): Promise<File> {
  try {
    const bmp = await loadBitmap(file);
    const canvas = drawScaled(bmp, IMAGE_MAX_EDGE);
    let blob = await toBlob(canvas, "image/webp", 0.72);
    let ext = "webp";
    if (blob.type !== "image/webp") { blob = await toBlob(canvas, "image/jpeg", 0.8); ext = "jpg"; }
    if (blob.size >= file.size && file.type !== "image/heic") return file; // already small
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type });
  } catch {
    return file;
  }
}

/** 96×96 WebP data URL for avatars (a few KB). */
export async function makeAvatarDataUrl(file: File, size = 96): Promise<string> {
  const bmp = await loadBitmap(file);
  const canvas = drawScaled(bmp, size, size);
  let blob = await toBlob(canvas, "image/webp", 0.7);
  if (blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", 0.75);
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(blob);
  });
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
    v.onerror = () => resolve(NaN);
    v.src = URL.createObjectURL(file);
  });
}

function pickVideoMime(): string | null {
  const c = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return c.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? null;
}

export function canCompressVideo() {
  return typeof MediaRecorder !== "undefined" && !!pickVideoMime() && !!HTMLCanvasElement.prototype.captureStream;
}

/**
 * Re-encodes a video at ≤720p / 25 fps / ~1.2 Mbps and stops at 30 s.
 * onProgress receives 0..1. Throws if the browser cannot re-encode.
 */
export async function compressVideo(file: File, onProgress?: (p: number) => void): Promise<File> {
  const mime = pickVideoMime();
  if (!mime || !HTMLCanvasElement.prototype.captureStream) throw new Error("unsupported");

  const video = document.createElement("video");
  video.muted = true; // required for autoplay; audio is captured separately
  video.playsInline = true;
  video.src = URL.createObjectURL(file);
  await new Promise<void>((res, rej) => { video.onloadedmetadata = () => res(); video.onerror = () => rej(new Error("decode")); });

  const scale = Math.min(1, VIDEO_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale / 2) * 2;
  canvas.height = Math.round(video.videoHeight * scale / 2) * 2;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(VIDEO_FPS);
  // Route the element's audio into the recording without playing it out loud.
  let audioCtx: AudioContext | null = null;
  try {
    audioCtx = new AudioContext();
    const src = audioCtx.createMediaElementSource(video);
    const dest = audioCtx.createMediaStreamDestination();
    src.connect(dest);
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    video.muted = false; video.volume = 0;
  } catch { /* no audio track, fine */ }

  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: AUDIO_BITRATE });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  const limit = Math.min(video.duration || VIDEO_MAX_SECONDS, VIDEO_MAX_SECONDS);
  const done = new Promise<void>((res) => { rec.onstop = () => res(); });

  let raf = 0;
  const draw = () => {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onProgress?.(Math.min(1, video.currentTime / limit));
    if (video.currentTime >= limit || video.ended) { stop(); return; }
    raf = requestAnimationFrame(draw);
  };
  const stop = () => { cancelAnimationFrame(raf); video.pause(); if (rec.state !== "inactive") rec.stop(); };

  rec.start(250);
  await video.play();
  draw();
  await done;
  URL.revokeObjectURL(video.src);
  audioCtx?.close().catch(() => {});

  const blob = new Blob(chunks, { type: mime.split(";")[0] });
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type });
}
