import type { RecipePrefs, RecipeGoal } from "@/db/schema";

export const GOALS: { value: RecipeGoal; label: string; icon: string; desc: string; prompt: string }[] = [
  { value: "normal", label: "Bình thường", icon: "restaurant", desc: "Cơm nhà ngon miệng", prompt: "Món ăn gia đình cân bằng, ngon miệng." },
  { value: "diet", label: "Ăn kiêng", icon: "monitor_weight", desc: "Giảm cân, ít calo", prompt: "Thực đơn GIẢM CÂN: mỗi khẩu phần dưới 400 kcal, ít dầu mỡ, hạn chế tinh bột tinh chế và đường, nhiều rau và chất xơ, ưu tiên luộc/hấp/áp chảo ít dầu." },
  { value: "gym", label: "Tập gym", icon: "fitness_center", desc: "Tăng cơ, nhiều đạm", prompt: "Thực đơn TẬP GYM tăng cơ: mỗi khẩu phần tối thiểu 30 g protein, kết hợp đạm nạc (ức gà, cá, trứng, đậu phụ, thịt nạc) với rau đã mua và tinh bột tốt (gạo lứt, khoai), đủ 500–700 kcal." },
];

export const DIET_TAGS: { value: string; label: string; prompt: string }[] = [
  { value: "it_dau_mo", label: "Ít dầu mỡ", prompt: "ít dầu mỡ" },
  { value: "it_tinh_bot", label: "Ít tinh bột", prompt: "ít tinh bột" },
  { value: "khong_duong", label: "Không đường", prompt: "không thêm đường" },
  { value: "chay", label: "Chay", prompt: "hoàn toàn chay, không thịt cá trứng" },
  { value: "khong_cay", label: "Không cay", prompt: "không cay" },
  { value: "khong_hai_san", label: "Không hải sản", prompt: "không hải sản" },
  { value: "nhanh", label: "Dưới 20 phút", prompt: "nấu dưới 20 phút" },
];

export const DEFAULT_PREFS: RecipePrefs = { goal: "normal", tags: [], servings: 2, notes: "" };

export function normalizePrefs(input: unknown): RecipePrefs {
  const p = (input ?? {}) as Partial<RecipePrefs>;
  const goal = GOALS.some((g) => g.value === p.goal) ? (p.goal as RecipeGoal) : "normal";
  const tags = Array.isArray(p.tags) ? p.tags.filter((t): t is string => typeof t === "string" && DIET_TAGS.some((d) => d.value === t)).slice(0, 7) : [];
  const servings = Math.min(8, Math.max(1, Math.round(Number(p.servings)) || 2));
  const notes = typeof p.notes === "string" ? p.notes.trim().slice(0, 200) : "";
  return { goal, tags, servings, notes };
}

export const isDefaultPrefs = (p: RecipePrefs) => p.goal === "normal" && p.tags.length === 0 && p.servings === 2 && !p.notes;

export function prefsToPrompt(p: RecipePrefs) {
  const goal = GOALS.find((g) => g.value === p.goal)!;
  const tags = p.tags.map((t) => DIET_TAGS.find((d) => d.value === t)?.prompt).filter(Boolean);
  return [
    goal.prompt,
    tags.length ? `Yêu cầu thêm: ${tags.join(", ")}.` : "",
    `Khẩu phần cho ${p.servings} người.`,
    p.notes ? `Lưu ý của khách (dị ứng / sở thích): ${p.notes}.` : "",
  ].filter(Boolean).join(" ");
}
