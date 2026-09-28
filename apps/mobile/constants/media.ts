import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { apiUpload } from "./api";

/** Default cap for a video; a caller with another rule passes its own `videoMaxSeconds`. */
export const VIDEO_MAX_SECONDS = 30;
const IMAGE_MAX_EDGE = 1280;
/** A recording stopped by the camera at the cap can come out a fraction of a second longer. */
const DURATION_SLACK_MS = 1000;

export interface PickedMedia {
  uri: string;
  kind: "image" | "video";
  mimeType: string;
  fileName: string;
  /** bytes, when the picker reports it */
  size?: number;
  durationMs?: number;
}

export interface PickOptions {
  source: "library" | "camera";
  kind?: "image" | "video" | "any";
  /** How many files the library lets the person choose (default 1). */
  max?: number;
  /** Longest video accepted, in seconds (default 30). */
  videoMaxSeconds?: number;
  onStatus?: (status: string) => void;
}

/**
 * Camera / library picker: photos come back ≤1280 px JPEG, videos are limited by duration.
 * `kind` picks what the camera opens in: "video" starts the recorder instead of the photo
 * shutter — passing both types to the system camera on Android only ever takes photos.
 *
 * Video: on iOS the picker re-encodes to H.264 720p (library) or records at medium quality
 * (camera). Android has no re-encoding step: the file is the one the camera app or gallery gave.
 * A video longer than the limit is refused here, since `videoMaxDuration` only binds the iOS
 * recorder and those Android camera apps that honour it, never a library pick.
 */
export async function pickMedia(opts: PickOptions): Promise<PickedMedia[]> {
  const kind = opts.kind ?? "image";
  const maxSeconds = opts.videoMaxSeconds ?? VIDEO_MAX_SECONDS;
  const video = {
    videoMaxDuration: maxSeconds,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
  };
  let result: ImagePicker.ImagePickerResult;
  if (opts.source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error(kind === "video" ? "Xin cho phép dùng máy ảnh trong phần Cài đặt để quay video ạ." : "Xin cho phép dùng máy ảnh trong phần Cài đặt để chụp ảnh ạ.");
    result = await ImagePicker.launchCameraAsync({ mediaTypes: kind === "video" ? ["videos"] : ["images"], quality: 0.9, ...video });
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error("Xin cho phép xem thư viện ảnh trong phần Cài đặt để chọn tệp ạ.");
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === "video" ? ["videos"] : kind === "any" ? ["images", "videos"] : ["images"],
      quality: 0.9,
      allowsMultipleSelection: (opts.max ?? 1) > 1,
      selectionLimit: opts.max ?? 1,
      ...video,
    });
  }
  if (result.canceled) return [];

  const out: PickedMedia[] = [];
  for (const a of result.assets) {
    if (a.type === "video") {
      const durationMs = a.duration && a.duration > 0 ? a.duration : undefined;
      if (durationMs && durationMs > maxSeconds * 1000 + DURATION_SLACK_MS) {
        throw new Error(`Video này dài ${fmtDuration(durationMs)}, xin chọn hoặc quay video không quá ${maxSeconds} giây giúp ạ.`);
      }
      const mimeType = a.mimeType ?? (/\.mov$/i.test(a.uri) ? "video/quicktime" : "video/mp4");
      const ext = mimeType === "video/quicktime" ? "mov" : mimeType === "video/webm" ? "webm" : "mp4";
      const original: PickedMedia = { uri: a.uri, kind: "video", mimeType, fileName: `video-${Date.now()}.${ext}`, size: a.fileSize ?? undefined, durationMs };
      out.push(await compressVideo(original, (p) => opts.onStatus?.(`Đang nén video… ${Math.round(p * 100)}%`)));
    } else {
      opts.onStatus?.("Đang nén ảnh…");
      out.push(await compressImage(a.uri));
    }
  }
  return out;
}

const VIDEO_MAX_EDGE = 1280;
const VIDEO_BITRATE = 1_200_000;

/**
 * Re-encodes a video to at most 720p, 30 fps and about 1.2 Mbps (H.264, MP4), the same budget as
 * the web. The 30 fps cap lives in the encoder itself (see patches/react-native-compressor); a
 * faster recording has frames dropped. Falls back to the file as picked when the encoder is
 * missing (an older build) or fails, or when the result is not smaller.
 */
export async function compressVideo(m: PickedMedia, onProgress?: (fraction: number) => void): Promise<PickedMedia> {
  try {
    // Required lazily: importing the module throws in builds made before it was added.
    const { Video, getVideoMetaData } = require("react-native-compressor") as typeof import("react-native-compressor");
    onProgress?.(0);
    const uri = await Video.compress(m.uri, { compressionMethod: "manual", maxSize: VIDEO_MAX_EDGE, bitrate: VIDEO_BITRATE, progressDivider: 5 }, (p) => onProgress?.(Math.min(1, Math.max(0, p))));
    if (!uri) return m;
    const meta = await getVideoMetaData(uri).catch(() => null);
    const size = meta && Number(meta.size) > 0 ? Number(meta.size) : undefined;
    if (size && m.size && size >= m.size) return m;
    return { ...m, uri: uri.startsWith("file://") || uri.startsWith("content://") ? uri : `file://${uri}`, mimeType: "video/mp4", fileName: `video-${Date.now()}.mp4`, size };
  } catch (e) {
    console.warn("[media] video compression unavailable, sending the original", e);
    return m;
  }
}

/** Downscale to ≤1280 px on the long edge and re-encode as JPEG (quality 0.8). Never enlarges. */
export async function compressImage(uri: string): Promise<PickedMedia> {
  // Rendered once first: its size is the real one, with the EXIF rotation already applied.
  let img = await ImageManipulator.manipulate(uri).renderAsync();
  if (Math.max(img.width, img.height) > IMAGE_MAX_EDGE) {
    const small = await ImageManipulator.manipulate(img)
      .resize(img.width >= img.height ? { width: IMAGE_MAX_EDGE } : { height: IMAGE_MAX_EDGE })
      .renderAsync();
    img.release();
    img = small;
  }
  const saved = await img.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  img.release();
  return { uri: saved.uri, kind: "image", mimeType: "image/jpeg", fileName: `photo-${Date.now()}.jpg` };
}

/** `POST /upload` → public URL. `purpose` "refund" files the upload as return / refund evidence. */
export async function uploadMedia(m: PickedMedia, opts?: { purpose?: "refund"; onProgress?: (fraction: number) => void }): Promise<string> {
  const fd = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(m.uri)).blob();
    fd.append("file", new File([blob], m.fileName, { type: m.mimeType }));
  } else {
    // React Native's FormData accepts a { uri, name, type } descriptor for files.
    fd.append("file", { uri: m.uri, name: m.fileName, type: m.mimeType } as unknown as Blob);
  }
  if (opts?.purpose) fd.append("purpose", opts.purpose);
  const data = await apiUpload("/upload", fd, { onProgress: opts?.onProgress });
  if (typeof data?.url !== "string") throw new Error("Máy chủ không trả về đường dẫn của tệp, xin thử lại giúp ạ.");
  return data.url;
}

export const fmtMB = (b: number) => `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
/** "0:42" */
export const fmtDuration = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Square-crop + shrink to 96×96 and return a JPEG data URL small enough for the users.avatar_url column. */
export async function makeAvatarDataUrl(uri: string, width: number, height: number, size = 96): Promise<string> {
  const side = Math.min(width, height);
  const ctx = ImageManipulator.manipulate(uri)
    .crop({ originX: Math.floor((width - side) / 2), originY: Math.floor((height - side) / 2), width: side, height: side })
    .resize({ width: size, height: size });
  const img = await ctx.renderAsync();
  const saved = await img.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
  img.release();
  return `data:image/jpeg;base64,${saved.base64}`;
}

/**
 * Shrinks a photo to about `longSide` px and returns a JPEG data URL of at most `maxChars`
 * characters: quality goes down first, then the size, until it fits.
 */
export async function makePhotoDataUrl(uri: string, width: number, height: number, maxChars = 160_000, longSide = 320): Promise<string> {
  let side = longSide;
  let quality = 0.7;
  for (let attempt = 0; attempt < 10; attempt++) {
    const landscape = !(height > width);
    // Never enlarge a photo that is already smaller; the other side follows the proportions.
    const target = Math.max(1, Math.round(Math.min(side, (landscape ? width : height) || side)));
    const img = await ImageManipulator.manipulate(uri).resize(landscape ? { width: target } : { height: target }).renderAsync();
    const saved = await img.saveAsync({ compress: quality, format: SaveFormat.JPEG, base64: true });
    img.release();
    const url = `data:image/jpeg;base64,${saved.base64}`;
    if (saved.base64 && url.length <= maxChars) return url;
    if (quality > 0.45) quality -= 0.15;
    else {
      side = Math.round(side * 0.8);
      quality = 0.6;
    }
  }
  throw new Error("Ảnh này nặng quá, xin chọn ảnh khác giúp ạ.");
}
