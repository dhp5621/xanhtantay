import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, elevation, emojiFont, useStyles, type Colors } from "../../constants/theme";
import { DEFAULT_PREFS, GOALS, DIET_TAGS, RecipePrefs } from "../../constants/recipePrefs";
import { formatDate } from "../../constants/format";
import { useSession } from "../../hooks/useSession";
import { useLiveRefresh } from "../../hooks/useLive";
import { RecipeSettingsButton } from "../../components/RecipeSettingsSheet";
import { AnimIn, AnimInScale, HeroBlob, PressableScale, Skeleton } from "../../components/motion";
import { Button, Chip, EmptyState, PageHeader, Screen } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { Loader } from "../../components/Loader";
import { useDialog } from "../../components/Dialog";
import { EmojiText } from "../../components/EmojiText";

interface UserRecipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: string[];
  steps: string[];
  based_on: string[];
  source: string;
  minutes: number | null;
  created_at: string;
  order_id: string | null;
  kcal?: number | null;
  protein_g?: number | null;
  tags?: string[];
}
interface Mine { recipes: UserRecipe[]; purchased: string[]; ai: boolean }

const TAG_LABEL: Record<string, string> = Object.fromEntries([...GOALS.map((g) => [g.value, g.label]), ...DIET_TAGS.map((t) => [t.value, t.label])]);

/** Mirrors apps/web/src/app/(customer)/cong-thuc/page.tsx + RecipeAssistant. */
export default function CongThucScreen() {
  const styles = useStyles(makeStyles);
  const { alert } = useDialog();
  const { user, loading: sessionLoading } = useSession();
  const { order: focusOrderId } = useLocalSearchParams<{ order?: string }>();
  const [data, setData] = useState<Mine | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [prefs, setPrefs] = useState<RecipePrefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState<"all" | string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [mine, me] = await Promise.all([apiFetch("/recipes/mine"), apiFetch("/users/me").catch(() => null)]);
      setData(mine);
      setOpen((o) => o ?? mine.recipes[0]?.id ?? null);
      if (me?.recipe_prefs) setPrefs(me.recipe_prefs);
    } catch {
      setData((d) => d ?? { recipes: [], purchased: [], ai: false });
    }
  }, [user]);
  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const generate = async (opts: { count?: number; replace_id?: string; order_id?: string }) => {
    if (!data) return;
    setBusy(opts.replace_id ?? "all");
    try {
      const res = await apiFetch("/recipes/suggest", {
        method: "POST",
        body: JSON.stringify({ count: opts.count ?? 3, replace_id: opts.replace_id, order_id: opts.order_id, exclude: data.recipes.map((r) => r.title), prefs }),
      });
      const fresh: UserRecipe[] = res.recipes ?? [];
      setData((d) => d && { ...d, recipes: [...fresh, ...d.recipes.filter((r) => r.id !== opts.replace_id)] });
      setOpen(fresh[0]?.id ?? null);
    } catch (e) {
      alert("Không gợi ý được", e instanceof ApiError ? e.message : "Có lỗi xảy ra", undefined, { icon: "error" });
    } finally {
      setBusy(null);
    }
  };

  const savePrefs = async (p: RecipePrefs) => {
    setPrefs(p);
    try {
      await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ recipe_prefs: p }) });
    } catch {
      alert("Không lưu được tuỳ chọn", "Vẫn áp dụng cho lần này.", undefined, { icon: "warning" });
    }
  };

  const remove = (r: UserRecipe) =>
    alert("Bỏ món này?", r.title, [
      { text: "Giữ lại", style: "cancel" },
      {
        text: "Bỏ món",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/recipes/mine?id=${encodeURIComponent(r.id)}`, { method: "DELETE" });
            setData((d) => d && { ...d, recipes: d.recipes.filter((x) => x.id !== r.id) });
          } catch {
            alert("Không xoá được", undefined, undefined, { icon: "error" });
          }
        },
      },
    ]);

  if (!sessionLoading && !user) {
    return (
      <Screen style={{ padding: 16 }}>
        <PageHeader icon="skillet" eyebrow="Tiện ích bếp núc" title="Gợi ý mâm cơm" subtitle="AI gợi ý món ăn từ đúng những rau củ bạn đã mua" />
        <EmptyState icon="skillet" title="Đăng nhập để nhận gợi ý riêng" description="Mua bí đỏ và thịt băm, trợ lý gợi ý ngay canh bí đỏ thịt băm. Mỗi khách một thực đơn, lưu lại theo lịch sử mua." action={<Button label="Đăng nhập" icon="login" onPress={() => router.push("/dang-nhap?next=/tabs/cong-thuc&role=customer")} />} />
      </Screen>
    );
  }

  const recipes = data?.recipes ?? [];
  const noPurchases = (data?.purchased.length ?? 0) === 0;

  return (
    <Screen>
      <FlatList
        data={recipes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 16 }}>
            <PageHeader icon="skillet" eyebrow="Tiện ích bếp núc" title="Gợi ý mâm cơm" subtitle={data?.ai ? "Trợ lý AI nấu từ đúng những gì đã giao đến bạn" : "Gợi ý từ những gì đã giao đến bạn"} />
            {!data ? (
              <Skeleton height={180} radius={shape.xlIncreased} />
            ) : (
              <AnimInScale>
                <View style={styles.hero}>
                  <HeroBlob size={220} right={-60} top={-90} />
                  <Text style={styles.heroEyebrow}>RAU CỦ ĐÃ GIAO ĐẾN BẠN</Text>
                  {noPurchases ? (
                    <Text style={styles.heroBody}>Chưa có đơn nào được giao. Đơn đang thu hoạch hay đang trên xe chưa tính; rau về tới cửa là trợ lý gợi ý ngay.</Text>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {data.purchased.map((n) => <Chip key={n} icon="eco" label={n} small style={{ backgroundColor: colors.surfaceContainerLowest }} />)}
                    </View>
                  )}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16, alignItems: "center" }}>
                    {noPurchases ? (
                      <>
                        <Button label="Xem đơn đang giao" icon="package_2" small onPress={() => router.push("/tabs/don-hang")} />
                        <Button label="Chọn vườn rau" icon="potted_plant" variant="tonal" small onPress={() => router.push("/tabs/farms")} />
                      </>
                    ) : (
                      <>
                        <Button label={busy === "all" ? "Đang nghĩ món…" : recipes.length ? "Gợi ý thêm 3 món" : "Gợi ý món cho tôi"} icon="auto_awesome" loading={busy === "all"} disabled={busy !== null} onPress={() => generate({ count: 3, order_id: focusOrderId })} />
                        <RecipeSettingsButton prefs={prefs} onChange={savePrefs} disabled={busy !== null} />
                        {focusOrderId ? <Chip icon="receipt_long" label="Theo đơn đã giao này" tone="tertiary" small /> : null}
                      </>
                    )}
                  </View>
                  <Text style={styles.heroHint}>{data.ai ? "Chỉ tính rau đã giao tới tay bạn. Mỗi lần bấm là một thực đơn mới, không lặp lại món đã có; mọi gợi ý được lưu vào lịch sử." : "Chỉ tính rau đã giao tới tay bạn. Máy chủ chưa bật AI, đang dùng công thức mẫu."}</Text>
                </View>
              </AnimInScale>
            )}
            {recipes.length > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={styles.sectionTitle}>
                  <Icon name="menu_book" size={20} filled color={colors.primary} /> Thực đơn của bạn
                </Text>
                <Text style={styles.muted}>{recipes.length} món đã lưu</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={data && !noPurchases ? <EmptyState icon="restaurant" title="Chưa có công thức nào" description="Bấm “Gợi ý món cho tôi” để trợ lý nấu từ giỏ rau của bạn." /> : null}
        renderItem={({ item: r, index }) => {
          const expanded = open === r.id;
          const replacing = busy === r.id;
          const ai = r.source === "ai";
          return (
            <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 10 }}>
              <View style={[styles.card, elevation[1]]}>
                <PressableScale scaleTo={0.99} style={styles.cardHead} onPress={() => setOpen(expanded ? null : r.id)}>
                  <View style={[styles.leading, ai && { backgroundColor: colors.tertiaryContainer }]}>
                    <Icon name={ai ? "auto_awesome" : "restaurant"} size={22} filled color={ai ? colors.onTertiaryContainer : colors.onPrimaryContainer} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <EmojiText style={styles.recipeTitle}>{r.title}</EmojiText>
                    <Text style={styles.muted}>
                      {r.minutes ? `${r.minutes} phút · ` : ""}
                      {r.kcal ? `≈${r.kcal} kcal · ` : ""}
                      {r.protein_g ? `${r.protein_g}g đạm · ` : ""}
                      {r.based_on.length ? `từ ${r.based_on.join(", ")}` : `${r.ingredients.length} nguyên liệu`}
                    </Text>
                  </View>
                  <Icon name={expanded ? "expand_less" : "expand_more"} size={24} color={colors.onSurfaceVariant} />
                </PressableScale>

                {expanded && (
                  <AnimIn style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                    {(r.tags?.length ?? 0) > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                        {r.tags!.map((t) => <Chip key={t} icon={t === "gym" ? "fitness_center" : t === "diet" ? "monitor_weight" : "check"} label={t.startsWith("custom:") ? t.slice(7) : (TAG_LABEL[t] ?? t)} tone={t === "gym" || t === "diet" ? "tertiary" : "surface"} small />)}
                      </View>
                    )}
                    {r.description ? <EmojiText style={[styles.body, { marginBottom: 12 }]}>{r.description}</EmojiText> : null}
                    <Text style={styles.blockLabel}>NGUYÊN LIỆU</Text>
                    <View style={{ gap: 6, marginBottom: 14 }}>
                      {r.ingredients.map((ing, i) => {
                        const bought = r.based_on.some((b) => ing.toLowerCase().includes(b.toLowerCase()));
                        return (
                          <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                            <Icon name={bought ? "eco" : "circle"} size={bought ? 18 : 8} filled color={bought ? colors.primary : colors.onSurfaceVariant} style={bought ? undefined : { marginTop: 6 }} />
                            <EmojiText style={[styles.line, { flex: 1 }]}>
                              {ing}
                              {bought ? <Text style={{ color: colors.primary, fontSize: 12 }}>  đã mua</Text> : null}
                            </EmojiText>
                          </View>
                        );
                      })}
                    </View>
                    <Text style={styles.blockLabel}>CÁCH LÀM</Text>
                    <View style={{ gap: 8 }}>
                      {r.steps.map((s, i) => (
                        <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                          <View style={styles.stepDot}>
                            <Text style={styles.stepDotText}>{i + 1}</Text>
                          </View>
                          <EmojiText style={[styles.line, { flex: 1 }]}>{s}</EmojiText>
                        </View>
                      ))}
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 16 }}>
                      <Button label={replacing ? "Đang đổi…" : "Đổi món khác"} icon="swap_horiz" variant="tonal" small loading={replacing} disabled={busy !== null} onPress={() => generate({ count: 1, replace_id: r.id })} />
                      <Button label="Bỏ món này" icon="delete" variant="text" small disabled={busy !== null} onPress={() => remove(r)} style={{ paddingHorizontal: 8 }} />
                      <Text style={[styles.muted, { marginLeft: "auto" }]}>{ai ? "AI gợi ý" : "Công thức mẫu"} · {formatDate(r.created_at, { day: "numeric", month: "short" })}</Text>
                    </View>
                  </AnimIn>
                )}
                {replacing && !expanded && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                    <Loader size={20} />
                  </View>
                )}
              </View>
            </AnimIn>
          );
        }}
      />
    </Screen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    hero: { backgroundColor: colors.primaryContainer, borderRadius: shape.xlIncreased, padding: 20, overflow: "hidden" },
    heroEyebrow: { ...type.labelLarge, color: colors.onPrimaryContainer, opacity: 0.8, fontSize: 11, letterSpacing: 0.6, marginBottom: 8 },
    heroBody: { ...type.bodyMedium, color: colors.onPrimaryContainer },
    heroHint: { ...type.bodyMedium, color: colors.onSecondaryContainer, opacity: 0.85, fontSize: 12, marginTop: 10 },
    sectionTitle: { ...type.titleLarge, color: colors.onSurface, fontSize: 18 },
    muted: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
    body: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 14 },
    line: { ...type.bodyMedium, color: colors.onSurface, fontSize: 14, lineHeight: 21 },
    card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, overflow: "hidden" },
    cardHead: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
    leading: { width: 44, height: 44, borderRadius: shape.md, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
    recipeTitle: { ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
    blockLabel: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 11, letterSpacing: 0.6, marginBottom: 8 },
    stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    stepDotText: { color: colors.onPrimary, fontWeight: "800", fontSize: 11 },
  });
