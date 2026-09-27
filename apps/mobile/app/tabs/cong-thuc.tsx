import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import type { Recipe } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, elevation } from "../../constants/theme";
import { DEFAULT_PREFS, RecipePrefs } from "../../constants/recipePrefs";
import { RecipeSettingsButton, recipePrefsSummary } from "../../components/RecipeSettingsSheet";
import { Screen } from "../../components/ui";
import { useLiveRefresh } from "../../hooks/useLive";

type UserRecipe = Recipe & { description?: string | null; minutes?: number | null; kcal?: number | null; based_on?: string[] };

export default function CongThucScreen() {
  const [recipes, setRecipes] = useState<UserRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<RecipePrefs>(DEFAULT_PREFS);

  const load = useCallback(async () => {
    try {
      const [mine, me] = await Promise.all([apiFetch("/recipes/mine"), apiFetch("/users/me").catch(() => null)]);
      setRecipes(mine);
      if (me?.recipe_prefs) setPrefs(me.recipe_prefs);
    } catch {
      // ignore; login state handled by empty view
    }
  }, []);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const savePrefs = async (p: RecipePrefs) => {
    setPrefs(p);
    try {
      await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ recipe_prefs: p }) });
    } catch {
      // still applied locally for this session even if saving to the account failed
    }
  };

  const suggest = async () => {
    setSuggesting(true);
    try {
      const data = await apiFetch("/recipes/suggest", { method: "POST", body: JSON.stringify({ count: 3, prefs }) });
      setRecipes((rs) => [...(data.recipes ?? []), ...rs]);
    } catch (e) {
      Alert.alert("Không gợi ý được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setSuggesting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await apiFetch(`/recipes/mine?id=${id}`, { method: "DELETE" });
      setRecipes((rs) => rs.filter((r) => r.id !== id));
    } catch {
      Alert.alert("Lỗi", "Không xoá được công thức");
    }
  };

  return (
    <Screen style={{ padding: 16 }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Công thức của bạn</Text>
          <Text style={styles.subtitle}>Gợi ý món ăn từ rau bạn vừa nhận</Text>
        </View>
        <TouchableOpacity style={styles.suggestBtn} disabled={suggesting} onPress={suggest}>
          {suggesting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.suggestBtnText}>Gợi ý mới</Text>}
        </TouchableOpacity>
      </View>
      {loading && <ActivityIndicator color={colors.primary} />}
      <FlatList
        data={recipes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={!loading ? <Text style={styles.placeholderText}>Chưa có công thức nào. Bấm &quot;Gợi ý mới&quot; khi bạn đã nhận rau từ một đơn hàng.</Text> : null}
        renderItem={({ item: r }) => {
          const open = expanded === r.id;
          return (
            <TouchableOpacity style={[styles.card, elevation[1]]} onPress={() => setExpanded(open ? null : r.id)}>
              <View style={styles.cardHeader}>
                <Text style={styles.recipeTitle}>{r.title}</Text>
                <TouchableOpacity onPress={() => remove(r.id)}>
                  <Text style={styles.deleteLink}>Xoá</Text>
                </TouchableOpacity>
              </View>
              {r.description ? <Text style={styles.recipeDesc}>{r.description}</Text> : null}
              <Text style={styles.recipeMeta}>{r.minutes ? `${r.minutes} phút` : ""}{r.kcal ? ` · ${r.kcal} kcal` : ""}</Text>
              {open && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.blockLabel}>Nguyên liệu</Text>
                  {r.ingredients.map((ing, i) => (
                    <Text key={i} style={styles.bullet}>• {ing}</Text>
                  ))}
                  <Text style={[styles.blockLabel, { marginTop: 8 }]}>Các bước</Text>
                  {r.steps.map((s, i) => (
                    <Text key={i} style={styles.bullet}>{i + 1}. {s}</Text>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  title: { ...type.headlineSmall, color: colors.onSurface },
  subtitle: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 2, fontSize: 12 },
  suggestBtn: { backgroundColor: colors.primary, borderRadius: shape.full, paddingVertical: 10, paddingHorizontal: 16 },
  suggestBtnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 12 },
  placeholderText: { ...type.bodyMedium, color: colors.onSurfaceVariant },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  recipeTitle: { ...type.titleMedium, color: colors.onSurface, flex: 1 },
  deleteLink: { color: colors.error, fontWeight: "700", fontSize: 12 },
  recipeDesc: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 4, fontSize: 13 },
  recipeMeta: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 4, fontSize: 11 },
  blockLabel: { ...type.labelLarge, color: colors.onSurface, fontSize: 12, textTransform: "uppercase" },
  bullet: { ...type.bodyMedium, color: colors.onSurface, marginTop: 4, fontSize: 13 },
});
