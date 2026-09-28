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
