import { createHash } from "node:crypto";

export const AVATAR_SIZE = 256;
/** A 256×256 photo as a data URL: about 15 to 40 KB of image, a third more as text. */
export const MAX_AVATAR_CHARS = 120_000;
export const AVATAR_DATA_URL = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;

/**
 * Where the browser loads a user's avatar from. The photo itself lives in the database; the
 * session only carries this short address, because a session cookie cannot hold a whole photo.
 * `v` changes with the photo, so it can be cached for good.
 */
export function avatarHref(userId: string, dataUrl: string | null | undefined) {
  if (!dataUrl) return null;
  if (!dataUrl.startsWith("data:")) return dataUrl;
  return `/api/avatar/${encodeURIComponent(userId)}?v=${createHash("sha1").update(dataUrl).digest("hex").slice(0, 10)}`;
}
