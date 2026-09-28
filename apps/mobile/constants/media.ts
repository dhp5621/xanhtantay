import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

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
export async function makePhotoDataUrl(uri: string, width: number, height: number, maxChars = 160_000, longSide = 480): Promise<string> {
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
