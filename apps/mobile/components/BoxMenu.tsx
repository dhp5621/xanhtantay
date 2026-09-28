import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import type { BoxMealDay } from "@xanhtantay/types";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { AnimIn, PressableScale } from "./motion";
import { Chip } from "./ui";
import { Icon } from "./Icon";
import { EmojiText } from "./EmojiText";

const MEAL_ICON: Record<string, string> = { Trưa: "wb_sunny", Tối: "bedtime" };

/** The menu that ships with a box: pick a day, see lunch and dinner, open a dish for its recipe. */
export function BoxMenu({ mealPlan }: { mealPlan: BoxMealDay[] }) {
  const styles = useStyles(makeStyles);
  const days = [...(mealPlan ?? [])].sort((a, b) => a.day - b.day);
  const [day, setDay] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  if (!days.length) return <Text style={styles.muted}>Hộp này chưa có thực đơn đi kèm.</Text>;
  const selected = days.find((d) => d.day === day) ?? days[0];

  return (
    <View style={{ gap: 12 }}>
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

              {meal.recipe ? (
                <>
                  <PressableScale scaleTo={0.97} style={styles.toggle} onPress={() => setOpen(expanded ? null : key)}>
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
