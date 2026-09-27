import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { apiUpload } from "./api";

export const VIDEO_MAX_SECONDS = 30;
export const MAX_FILES = 4;
const IMAGE_MAX_EDGE = 1280;

export interface PickedMedia {
  uri: string;
  kind: "image" | "video";
  mimeType: string;
  fileName: string;
  /** bytes, when the picker reports it */
  size?: number;
  durationMs?: number;
}

/**
 * Camera-roll / camera picker matching the web composer: images ≤1280px JPEG, videos ≤30s.
 * `kind` picks what the camera opens in: "video" starts the recorder (with the 30s cap) instead of
 * the photo shutter — passing both types to the system camera on Android only ever takes photos.
 */
export async function pickMedia(opts: { source: "library" | "camera"; kind?: "image" | "video" | "any"; allowVideo?: boolean; max?: number; onStatus?: (status: string) => void }): Promise<PickedMedia[]> {
  const kind = opts.kind ?? (opts.allowVideo ? "any" : "image");
  const mediaTypes: ImagePicker.MediaType[] = kind === "video" ? ["videos"] : kind === "any" ? ["images", "videos"] : ["images"];
  let result: ImagePicker.ImagePickerResult;
  if (opts.source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error(kind === "video" ? "Cần quyền dùng camera để quay video" : "Cần quyền dùng camera để chụp ảnh");
    result = await ImagePicker.launchCameraAsync({ mediaTypes: kind === "video" ? ["videos"] : ["images"], quality: 0.9, videoMaxDuration: VIDEO_MAX_SECONDS, videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium });
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error("Cần quyền truy cập thư viện ảnh");
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      quality: 0.9,
      allowsMultipleSelection: (opts.max ?? 1) > 1,
      selectionLimit: opts.max ?? 1,
      videoMaxDuration: VIDEO_MAX_SECONDS,
    });
  }
  if (result.canceled) return [];

  const out: PickedMedia[] = [];
  for (const a of result.assets) {
    if (a.type === "video") {
      opts.onStatus?.("Đang nén video…");
      out.push({ uri: a.uri, kind: "video", mimeType: a.mimeType ?? "video/mp4", fileName: a.fileName ?? `video-${Date.now()}.mp4`, size: a.fileSize ?? undefined, durationMs: a.duration ?? undefined });
    } else {
      opts.onStatus?.("Đang nén ảnh…");
      out.push(await compressImage(a.uri, a.width, a.height));
    }
  }
  return out;
}

/** Downscale to ≤1280px on the long edge and re-encode as JPEG (~same budget as the web's WebP step). */
export async function compressImage(uri: string, width?: number, height?: number): Promise<PickedMedia> {
  const ctx = ImageManipulator.manipulate(uri);
  const longEdge = Math.max(width ?? 0, height ?? 0);
  if (longEdge > IMAGE_MAX_EDGE) {
    if ((width ?? 0) >= (height ?? 0)) ctx.resize({ width: IMAGE_MAX_EDGE });
    else ctx.resize({ height: IMAGE_MAX_EDGE });
  }
  const img = await ctx.renderAsync();
  const saved = await img.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  img.release();
  return { uri: saved.uri, kind: "image", mimeType: "image/jpeg", fileName: `photo-${Date.now()}.jpg` };
}

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

/** POST /api/upload → public URL. */
export async function uploadMedia(m: PickedMedia): Promise<string> {
  const fd = new FormData();
  // React Native's FormData accepts a { uri, name, type } descriptor for files.
  fd.append("file", { uri: m.uri, name: m.fileName, type: m.mimeType } as unknown as Blob);
  const data = await apiUpload("/upload", fd);
  return data.url as string;
}

export const fmtMB = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;
