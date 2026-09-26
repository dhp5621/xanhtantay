import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type } from "../../constants/theme";
import { DEFAULT_PREFS, RecipePrefs } from "../../constants/recipePrefs";
import { RecipeSettingsButton, recipePrefsSummary } from "../../components/RecipeSettingsSheet";

interface MealRecipe {
  minutes?: number;
  ingredients: string[];
  steps: string[];
}
interface MealPlanDay {
  day: number;
  meals: { time: string; title: string; uses: string[]; note?: string; recipe?: MealRecipe }[];
  leftover?: string;
}
interface MealPlan {
  id: string;
  days: number;
  summary: string;
  plan: MealPlanDay[];
  prefs?: RecipePrefs | null;
}

function samePrefs(a?: RecipePrefs | null, b?: RecipePrefs | null) {
  if (!a || !b) return false;
  return (
    a.goal === b.goal &&
    a.servings === b.servings &&
    (a.notes ?? "") === (b.notes ?? "") &&
    (a.customDiet ?? "") === (b.customDiet ?? "") &&
    [...a.tags].sort().join() === [...b.tags].sort().join()
  );
}

export default function KeHoachScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMeals, setOpenMeals] = useState<Record<string, boolean>>({});
  const [loadingMeals, setLoadingMeals] = useState<Record<string, boolean>>({});
  const [prefs, setPrefs] = useState<RecipePrefs>(DEFAULT_PREFS);
  const [prefsChanged, setPrefsChanged] = useState(false);

  const load = async (regenerate = false, prefsOverride?: RecipePrefs) => {
    setLoading(true);
    setError(null);
    try {
      const applied = prefsOverride ?? prefs;
      const row: MealPlan = await apiFetch("/recipes/plan", {
        method: "POST",
        body: JSON.stringify({ order_id: id, regenerate, prefs: applied }),
      });
      setPlan(row);
      setOpenMeals({});
      setPrefsChanged(!samePrefs(row.prefs, applied));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tạo được kế hoạch");
    } finally {
      setLoading(false);
    }
  };

  // Same settings as the recipe assistant: saved on the account, so both screens stay in sync.
  const savePrefs = async (p: RecipePrefs) => {
    setPrefs(p);
    setPrefsChanged(!!plan && !samePrefs(plan.prefs, p));
    try {
      await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ recipe_prefs: p }) });
    } catch {
      // still applied locally for this session even if saving to the account failed
    }
  };

  useEffect(() => {
    if (!id) return;
    apiFetch("/users/me")
      .then((me) => {
        const initialPrefs = me?.recipe_prefs ?? DEFAULT_PREFS;
        setPrefs(initialPrefs);
        return load(false, initialPrefs);
      })
      .catch(() => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function showHowTo(day: number, mealIdx: number) {
    if (!plan) return;
    const key = `${day}-${mealIdx}`;
    const meal = plan.plan.find((d) => d.day === day)?.meals[mealIdx];
    if (meal?.recipe) {
      setOpenMeals((o) => ({ ...o, [key]: !o[key] }));
      return;
    }
    setLoadingMeals((l) => ({ ...l, [key]: true }));
    try {
      const recipe: MealRecipe = await apiFetch("/recipes/plan/meal", {
        method: "POST",
        body: JSON.stringify({ plan_id: plan.id, day, meal: mealIdx }),
      });
      setPlan((p) =>
        p && {
          ...p,
          plan: p.plan.map((d) =>
            d.day !== day ? d : { ...d, meals: d.meals.map((m, i) => (i === mealIdx ? { ...m, recipe } : m)) }
          ),
        }
      );
      setOpenMeals((o) => ({ ...o, [key]: true }));
    } catch {
      // silently ignore — button just stays as "Xem cách làm"
    } finally {
      setLoadingMeals((l) => ({ ...l, [key]: false }));
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{error ?? "Không có kế hoạch"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={styles.title}>Kế hoạch {plan.days} ngày 🍽️</Text>
      <Text style={styles.summary}>{plan.summary}</Text>

      <View style={styles.prefsRow}>
        <RecipeSettingsButton prefs={prefs} onChange={savePrefs} />
        <Text style={styles.prefsSummary}>{recipePrefsSummary(prefs)}</Text>
      </View>
      {prefsChanged && <Text style={styles.prefsHint}>Tuỳ chọn mới — bấm "Tạo lại kế hoạch" để áp dụng</Text>}

      {plan.plan.map((d) => (
        <View key={d.day} style={styles.dayCard}>
          <Text style={styles.dayTitle}>Ngày {d.day}</Text>
          {d.meals.map((m, i) => {
            const key = `${d.day}-${i}`;
            const open = !!openMeals[key];
            const mealLoading = !!loadingMeals[key];
            return (
              <View key={i} style={styles.mealBlock}>
                <View style={styles.mealRow}>
                  <Text style={styles.mealTime}>{m.time}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealTitle}>{m.title}</Text>
                    <Text style={styles.mealUses}>{m.uses.join(", ")}</Text>
                    {m.note ? <Text style={styles.mealNote}>💡 {m.note}</Text> : null}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.howToBtn}
                  onPress={() => showHowTo(d.day, i)}
                  disabled={mealLoading}
                >
                  {mealLoading ? (
                    <ActivityIndicator size="small" color={colors.onSecondaryContainer} />
                  ) : (
                    <Text style={styles.howToBtnText}>{open ? "Thu gọn" : "📖 Xem cách làm"}</Text>
                  )}
                </TouchableOpacity>
                {open && m.recipe && (
                  <View style={styles.recipeBox}>
                    {m.recipe.minutes ? <Text style={styles.recipeMinutes}>⏱ Khoảng {m.recipe.minutes} phút</Text> : null}
                    <Text style={styles.recipeHeading}>Nguyên liệu</Text>
                    {m.recipe.ingredients.map((ing, k) => (
                      <Text key={k} style={styles.recipeLine}>
                        •  {ing}
                      </Text>
                    ))}
                    <Text style={[styles.recipeHeading, { marginTop: 10 }]}>Cách làm</Text>
                    {m.recipe.steps.map((s, k) => (
                      <Text key={k} style={styles.recipeLine}>
                        {k + 1}.  {s}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
          {d.leftover ? <Text style={styles.leftover}>Còn lại: {d.leftover}</Text> : null}
        </View>
      ))}

      <TouchableOpacity style={styles.regenBtn} onPress={() => load(true)}>
        <Text style={styles.regenBtnText}>{prefsChanged ? "Áp dụng & tạo lại kế hoạch" : "Tạo lại kế hoạch"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  body: { ...type.bodyMedium, color: colors.onSurfaceVariant, textAlign: "center" },
  title: { ...type.headlineSmall, color: colors.onSurface },
  summary: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 6, marginBottom: 12 },
  prefsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" },
  prefsSummary: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, flexShrink: 1 },
  prefsHint: { ...type.bodyMedium, color: colors.tertiary, fontSize: 12, marginTop: 4, marginBottom: 12 },
  dayCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 14, marginBottom: 12 },
  dayTitle: { ...type.titleMedium, color: colors.primary, marginBottom: 8 },
  mealBlock: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainerHighest },
  mealRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  mealTime: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 12, minWidth: 44 },
  mealTitle: { ...type.bodyLarge, color: colors.onSurface, fontWeight: "600" },
  mealUses: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  mealNote: { ...type.bodyMedium, color: colors.tertiary, fontSize: 12, marginTop: 2 },
  howToBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.secondaryContainer,
    borderRadius: shape.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  howToBtnText: { ...type.labelLarge, color: colors.onSecondaryContainer, fontSize: 12 },
  recipeBox: { marginTop: 10, backgroundColor: colors.surfaceContainer, borderRadius: shape.md, padding: 12 },
  recipeMinutes: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 8 },
  recipeHeading: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 11, textTransform: "uppercase", marginBottom: 4 },
  recipeLine: { ...type.bodyMedium, color: colors.onSurface, fontSize: 13, lineHeight: 20 },
  leftover: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, fontStyle: "italic", marginTop: 4 },
  regenBtn: { backgroundColor: colors.secondaryContainer, borderRadius: shape.full, padding: 14, alignItems: "center", marginTop: 8 },
  regenBtnText: { color: colors.onSecondaryContainer, fontWeight: "700" },
});
