// Mirrors apps/web/src/lib/recipe-prefs.ts.
export type RecipeGoal = "normal" | "diet" | "gym";
export interface RecipePrefs {
  goal: RecipeGoal;
  tags: string[];
  servings: number;
  notes?: string;
  customDiet?: string;
}

export const GOALS: { value: RecipeGoal; label: string; icon: string; desc: string }[] = [
  { value: "normal", label: "Bình thường", icon: "🍚", desc: "Cơm nhà ngon miệng" },
  { value: "diet", label: "Ăn kiêng", icon: "⚖️", desc: "Giảm cân, ít calo" },
  { value: "gym", label: "Tập gym", icon: "💪", desc: "Tăng cơ, nhiều đạm" },
];

export const DIET_TAGS: { value: string; label: string }[] = [
  { value: "it_dau_mo", label: "Ít dầu mỡ" },
  { value: "it_tinh_bot", label: "Ít tinh bột" },
  { value: "khong_duong", label: "Không đường" },
  { value: "chay", label: "Chay" },
  { value: "khong_cay", label: "Không cay" },
  { value: "khong_hai_san", label: "Không hải sản" },
  { value: "nhanh", label: "Dưới 20 phút" },
];

export const DEFAULT_PREFS: RecipePrefs = { goal: "normal", tags: [], servings: 2, notes: "", customDiet: "" };

export function normalizePrefs(input: unknown): RecipePrefs {
  const p = (input ?? {}) as Partial<RecipePrefs>;
  const goal = GOALS.some((g) => g.value === p.goal) ? (p.goal as RecipeGoal) : "normal";
  const tags = Array.isArray(p.tags) ? p.tags.filter((t): t is string => typeof t === "string" && DIET_TAGS.some((d) => d.value === t)).slice(0, 7) : [];
  const servings = Math.min(8, Math.max(1, Math.round(Number(p.servings)) || 2));
  const notes = typeof p.notes === "string" ? p.notes.trim().slice(0, 200) : "";
  const customDiet = typeof p.customDiet === "string" ? p.customDiet.trim().slice(0, 120) : "";
  return { goal, tags, servings, notes, customDiet };
}

export const isDefaultPrefs = (p: RecipePrefs) =>
  p.goal === "normal" && p.tags.length === 0 && p.servings === 2 && !p.notes && !p.customDiet;
