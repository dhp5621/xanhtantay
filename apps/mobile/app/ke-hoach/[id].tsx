import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type } from "../../constants/theme";

interface MealPlanDay {
  day: number;
  meals: { time: string; title: string; uses: string[]; note?: string }[];
  leftover?: string;
}
interface MealPlan {
  id: string;
  days: number;
  summary: string;
  plan: MealPlanDay[];
}

export default function KeHoachScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (regenerate = false) => {
    setLoading(true);
    setError(null);
    try {
      setPlan(await apiFetch("/recipes/plan", { method: "POST", body: JSON.stringify({ order_id: id, regenerate }) }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tạo được kế hoạch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

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

      {plan.plan.map((d) => (
        <View key={d.day} style={styles.dayCard}>
          <Text style={styles.dayTitle}>Ngày {d.day}</Text>
          {d.meals.map((m, i) => (
            <View key={i} style={styles.mealRow}>
              <Text style={styles.mealTime}>{m.time}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealTitle}>{m.title}</Text>
                <Text style={styles.mealUses}>{m.uses.join(", ")}</Text>
                {m.note ? <Text style={styles.mealNote}>💡 {m.note}</Text> : null}
              </View>
            </View>
          ))}
          {d.leftover ? <Text style={styles.leftover}>Còn lại: {d.leftover}</Text> : null}
        </View>
      ))}

      <TouchableOpacity style={styles.regenBtn} onPress={() => load(true)}>
        <Text style={styles.regenBtnText}>Tạo lại kế hoạch</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  body: { ...type.bodyMedium, color: colors.onSurfaceVariant, textAlign: "center" },
  title: { ...type.headlineSmall, color: colors.onSurface },
  summary: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 6, marginBottom: 16 },
  dayCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 14, marginBottom: 12 },
  dayTitle: { ...type.titleMedium, color: colors.primary, marginBottom: 8 },
  mealRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  mealTime: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 12, minWidth: 44 },
  mealTitle: { ...type.bodyLarge, color: colors.onSurface, fontWeight: "600" },
  mealUses: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  mealNote: { ...type.bodyMedium, color: colors.tertiary, fontSize: 12, marginTop: 2 },
  leftover: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, fontStyle: "italic", marginTop: 4 },
  regenBtn: { backgroundColor: colors.secondaryContainer, borderRadius: shape.full, padding: 14, alignItems: "center", marginTop: 8 },
  regenBtnText: { color: colors.onSecondaryContainer, fontWeight: "700" },
});
