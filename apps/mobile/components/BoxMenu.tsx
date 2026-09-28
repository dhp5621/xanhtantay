import { useRef, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import type { BoxMealDay } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../constants/api";
import { colors, shape, type, elevation, useStyles, type Colors } from "../constants/theme";
import type { MenuResponse, MenuTarget } from "../constants/types";
import { AnimIn, PressableScale } from "./motion";
import { Button, Chip } from "./ui";
import { useDialog } from "./Dialog";
import { Loader } from "./Loader";
import { Icon } from "./Icon";
import { EmojiText } from "./EmojiText";

const MEAL_ICON: Record<string, string> = { Trưa: "wb_sunny", Tối: "bedtime" };

// The AI searches the web before it answers; the server allows itself up to a minute.
const MENU_TIMEOUT_MS = 90_000;

/**
 * The menu that ships with a box: pick a day, see lunch and dinner, open a dish for its recipe.
 * With `target` the customer can ask for another way to cook a meal, or for a whole new week.
 */
export function BoxMenu({ mealPlan, target, customised: wasCustomised = false }: { mealPlan: BoxMealDay[]; target?: MenuTarget; customised?: boolean }) {
  const styles = useStyles(makeStyles);
  const { alert } = useDialog();
  const [plan, setPlan] = useState<BoxMealDay[]>(mealPlan ?? []);
  const [customised, setCustomised] = useState(wasCustomised);
  const [day, setDay] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [wish, setWish] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Every dish shown so far, so a new search never hands back one the customer already passed on.
  const seen = useRef(new Set((mealPlan ?? []).flatMap((d) => d.meals.map((m) => m.title))));
  const days = [...plan].sort((a, b) => a.day - b.day);

  const change = async (key: string, body: Record<string, unknown>, done: (ai: boolean) => string) => {
    if (!target || busy) return false;
    setBusy(key);
    setNotice(null);
    try {
      const res = (await apiFetch("/menu", {
        method: "POST",
        timeoutMs: MENU_TIMEOUT_MS,
        body: JSON.stringify({ ...("orderId" in target ? { order_id: target.orderId } : { box: target.box, plan }), seen: [...seen.current], ...body }),
      })) as MenuResponse;
      res.plan.forEach((d) => d.meals.forEach((m) => seen.current.add(m.title)));
      setPlan(res.plan);
      setCustomised(!!res.customised);
      setNotice(done(!!res.ai));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        alert("Đăng nhập để đổi thực đơn", "Bạn đăng nhập rồi quay lại đây để đổi món nhé.", [
          { text: "Để sau", style: "cancel" },
          { text: "Đăng nhập", onPress: () => router.push("/dang-nhap") },
        ]);
      } else {
        alert("Chưa đổi được thực đơn", e instanceof ApiError ? e.message : "Mạng đang yếu, xin thử lại giúp ạ.");
      }
      return false;
    } finally {
      setBusy(null);
    }
  };
  const newWeek = () => change("week", { action: "week" }, (ai) => (ai ? "Đã lên thực đơn mới từ các công thức trên mạng" : "Đã đổi sang thực đơn khác của bếp nhà"));
  const reset = () => change("reset", { action: "reset" }, () => "Đã về thực đơn gốc của hộp");
  const newMeal = async (key: string, d: number, i: number) => {
    const ok = await change(key, { action: "meal", day: d, meal: i, wish: (wish[key] ?? "").trim() }, (ai) => (ai ? "Đã tìm được cách làm mới trên mạng" : "Đã đổi sang món khác của bếp nhà"));
    if (ok) setWish((w) => ({ ...w, [key]: "" }));
  };

  if (!days.length) return <Text style={styles.muted}>Hộp này chưa có thực đơn đi kèm.</Text>;
  const selected = days.find((d) => d.day === day) ?? days[0];

  return (
    <View style={{ gap: 12 }}>
      {target ? (
        <View style={{ gap: 8 }}>
          <PressableScale
            haptic={Haptics.ImpactFeedbackStyle.Medium}
            scaleTo={0.97}
            disabled={!!busy}
            style={[styles.week, elevation[2]]}
            onPress={newWeek}
            accessibilityRole="button"
            accessibilityLabel="Đổi thực đơn cả tuần"
            accessibilityHint="AI tìm công thức mới trên mạng, có thể mất tới một phút"
            accessibilityState={{ disabled: !!busy, busy: busy === "week" }}
          >
            {busy === "week" ? <Loader size={26} color={colors.onPrimary} /> : <Icon name="refresh" size={26} color={colors.onPrimary} />}
            <Text style={styles.weekText}>{busy === "week" ? "Đang tìm công thức mới trên mạng…" : "Đổi thực đơn cả tuần"}</Text>
          </PressableScale>
          <Text style={styles.muted}>Chán thực đơn có sẵn? AI tìm công thức mới trên mạng, vẫn nấu từ đúng rau củ trong hộp.</Text>
          {customised ? <Button label="Về thực đơn gốc" icon="restart_alt" variant="text" small onPress={reset} disabled={!!busy} loading={busy === "reset"} style={{ marginLeft: -8 }} /> : null}
          {notice ? (
            <View style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Icon name="check_circle" size={18} filled color={colors.onPrimaryContainer} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {days.map((d) => (
          <Chip
            key={d.day}
            label={`Ngày ${d.day}`}
            icon={d.day === selected.day ? "check" : undefined}
            selected={d.day === selected.day}
            onPress={() => {
              setDay(d.day);
              setOpen(null);
            }}
          />
        ))}
      </ScrollView>

      {selected.meals.map((meal, i) => {
        const key = `${selected.day}-${i}`;
        const expanded = open === key;
        return (
          <AnimIn key={key} index={i}>
            <View style={styles.meal}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View style={styles.mealIcon}>
                  <Icon name={MEAL_ICON[meal.time] ?? "restaurant"} size={22} filled color={colors.onTertiaryContainer} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.mealTime}>Bữa {meal.time.toLowerCase()}</Text>
                  <EmojiText style={styles.mealTitle}>{meal.title}</EmojiText>
                </View>
                {meal.recipe?.minutes ? <Chip icon="schedule" label={`${meal.recipe.minutes} phút`} small /> : null}
              </View>

              {meal.uses?.length ? (
                <View style={styles.uses}>
                  {meal.uses.map((u) => (
                    <Chip key={u} icon="eco" label={u} tone="primary" small />
                  ))}
                </View>
              ) : null}
              {meal.note ? <EmojiText style={styles.note}>{meal.note}</EmojiText> : null}
              {meal.source ? (
                <View style={styles.source}>
                  <Icon name="public" size={14} color={colors.onSurfaceVariant} />
                  <Text style={[styles.muted, { flex: 1 }]}>Nguồn: {meal.source}</Text>
                </View>
              ) : null}

              {meal.recipe ? (
                <>
                  <PressableScale scaleTo={0.97} style={styles.toggle} onPress={() => setOpen(expanded ? null : key)} accessibilityRole="button" accessibilityLabel={`${expanded ? "Thu gọn cách làm" : "Xem cách làm"} ${meal.title}`} accessibilityState={{ expanded }}>
                    <Icon name="menu_book" size={18} color={colors.primary} />
                    <Text style={styles.toggleText}>{expanded ? "Thu gọn cách làm" : "Xem cách làm"}</Text>
                    <Icon name={expanded ? "expand_less" : "expand_more"} size={20} color={colors.primary} />
                  </PressableScale>
                  {expanded && (
                    <AnimIn style={styles.recipe}>
                      <Text style={styles.blockLabel}>NGUYÊN LIỆU</Text>
                      {meal.recipe.ingredients.map((ing, k) => (
                        <View key={k} style={styles.ingRow}>
                          <View style={styles.bullet} />
                          <EmojiText style={styles.body}>{ing}</EmojiText>
                        </View>
                      ))}
                      <Text style={[styles.blockLabel, { marginTop: 14 }]}>CÁCH LÀM</Text>
                      {meal.recipe.steps.map((step, k) => (
                        <View key={k} style={styles.stepRow}>
                          <View style={styles.stepNo}>
                            <Text style={styles.stepNoText}>{k + 1}</Text>
                          </View>
                          <EmojiText style={styles.body}>{step}</EmojiText>
                        </View>
                      ))}
                      {target ? (
                        <View style={styles.ask}>
                          <Text style={styles.blockLabel}>TÔI MUỐN CÁCH LÀM KHÁC</Text>
                          <TextInput
                            style={styles.input}
                            value={wish[key] ?? ""}
                            onChangeText={(t) => setWish((w) => ({ ...w, [key]: t }))}
                            placeholder="Ví dụ: ít dầu mỡ, kiểu Hàn, món đang hot, cho bé ăn…"
                            placeholderTextColor={colors.onSurfaceVariant}
                            maxLength={200}
                            editable={!busy}
                            returnKeyType="search"
                            onSubmitEditing={() => newMeal(key, selected.day, i)}
                            accessibilityLabel={`Tôi muốn cách làm khác cho món ${meal.title}`}
                          />
                          <Button label={busy === key ? "Đang tìm…" : "Tìm cách mới"} icon={busy === key ? undefined : "search"} variant="tonal" onPress={() => newMeal(key, selected.day, i)} disabled={!!busy} style={{ alignSelf: "stretch" }} />
                        </View>
                      ) : null}
                    </AnimIn>
                  )}
                </>
              ) : null}
            </View>
          </AnimIn>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    muted: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13 },
    meal: { backgroundColor: c.surfaceContainerLowest, borderRadius: shape.xl, padding: 16, borderWidth: 1, borderColor: c.outlineVariant },
    mealIcon: { width: 44, height: 44, borderRadius: shape.md, backgroundColor: c.tertiaryContainer, alignItems: "center", justifyContent: "center" },
    mealTime: { ...type.labelLarge, color: c.tertiary, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 },
    mealTitle: { ...type.titleMedium, color: c.onSurface, fontSize: 16, lineHeight: 22 },
    uses: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
    note: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13, marginTop: 10 },
    source: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
    week: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: c.primary, borderRadius: shape.full, minHeight: 64, paddingVertical: 14, paddingHorizontal: 22 },
    weekText: { ...type.titleMedium, color: c.onPrimary, fontSize: 18, lineHeight: 24, fontWeight: "700", flexShrink: 1, includeFontPadding: false },
    notice: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.primaryContainer, borderRadius: shape.md, paddingVertical: 10, paddingHorizontal: 14 },
    noticeText: { ...type.bodyMedium, color: c.onPrimaryContainer, fontSize: 13, flex: 1 },
    ask: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.outlineVariant, gap: 8 },
    input: { backgroundColor: c.surfaceContainer, borderRadius: shape.md, padding: 13, color: c.onSurface, fontSize: 15, borderWidth: 1, borderColor: c.outlineVariant },
    toggle: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: shape.full, backgroundColor: c.surfaceContainer },
    toggleText: { ...type.labelLarge, color: c.primary, fontSize: 13 },
    recipe: { marginTop: 12, backgroundColor: c.surfaceContainerLow, borderRadius: shape.lg, padding: 14 },
    blockLabel: { ...type.labelLarge, color: c.onSurfaceVariant, fontSize: 11, letterSpacing: 0.6, marginBottom: 6 },
    ingRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 4 },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary, marginTop: 8 },
    stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8 },
    stepNo: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.primaryContainer, alignItems: "center", justifyContent: "center" },
    stepNoText: { ...type.labelLarge, color: c.onPrimaryContainer, fontSize: 12 },
    body: { ...type.bodyMedium, color: c.onSurface, fontSize: 14, lineHeight: 21, flex: 1 },
  });
