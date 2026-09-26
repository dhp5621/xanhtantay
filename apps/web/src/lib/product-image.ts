/** Product picture or a category-tinted placeholder. */
export const CATEGORY_TINT: Record<string, string> = {
  rau_la: "linear-gradient(135deg, #A8F5BE, #D0E8D8)",
  cu_qua: "linear-gradient(135deg, #FFE0B2, #FFD7E5)",
  rau_thom: "linear-gradient(135deg, #C8F5D0, #BEEAF9)",
  rau_mam: "linear-gradient(135deg, #E6F7C8, #D0E8D8)",
};
export const productBackground = (image_url: string | null | undefined, category: string) =>
  image_url ? `url(${image_url}) center/cover` : CATEGORY_TINT[category] ?? CATEGORY_TINT.rau_la;
