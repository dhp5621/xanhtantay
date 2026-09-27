import { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { colors, shape, type, useStyles } from "../constants/theme";
import { GOALS, DIET_TAGS, RecipePrefs, DEFAULT_PREFS, isDefaultPrefs } from "../constants/recipePrefs";
import { Icon } from "./Icon";
import type { Colors } from "../constants/theme";
import { Loader } from "./Loader";

export function recipePrefsSummary(prefs: RecipePrefs): string {
  const goal = GOALS.find((g) => g.value === prefs.goal);
  return [
    goal?.label ?? "",
    prefs.tags.length ? `${prefs.tags.length} chế độ ăn` : null,
    prefs.customDiet || null,
    `${prefs.servings} người`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function RecipeSettingsButton({ prefs, onChange, disabled }: { prefs: RecipePrefs; onChange: (p: RecipePrefs) => void | Promise<void>; disabled?: boolean }) {
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RecipePrefs>(prefs);
  const [saving, setSaving] = useState(false);
  const active = !isDefaultPrefs(prefs);
  const goal = GOALS.find((g) => g.value === prefs.goal)!;

  const show = () => {
    setDraft(prefs);
    setOpen(true);
  };

  const toggleTag = (t: string) =>
    setDraft((d) => ({ ...d, tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] }));

  const apply = async () => {
    setSaving(true);
    try {
      await onChange(draft);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={[styles.trigger, active && styles.triggerActive]} onPress={show} disabled={disabled}>
        <Text style={[styles.triggerText, active && styles.triggerTextActive]}><Icon name={active ? goal.icon : "tune"} size={16} filled={active} color={active ? colors.onTertiaryContainer : colors.onSurfaceVariant} /> {active ? goal.label : "Tuỳ chọn"}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={styles.sheetTitle}>Tuỳ chọn thực đơn</Text>
              <Text style={styles.sheetSubtitle}>Lưu theo tài khoản, áp dụng cho mọi lần gợi ý</Text>

              <Text style={styles.label}>Mục tiêu</Text>
              <View style={styles.goalRow}>
                {GOALS.map((g) => {
                  const sel = draft.goal === g.value;
                  return (
                    <TouchableOpacity
                      key={g.value}
                      style={[styles.goalCard, sel && styles.goalCardSelected]}
                      onPress={() => setDraft((d) => ({ ...d, goal: g.value }))}
                    >
                      <Icon name={g.icon} size={26} filled={sel} color={sel ? colors.onTertiaryContainer : colors.onSurfaceVariant} />
                      <Text style={[styles.goalLabel, sel && styles.goalLabelSelected]}>{g.label}</Text>
                      <Text style={[styles.goalDesc, sel && styles.goalLabelSelected]}>{g.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Chế độ ăn</Text>
              <View style={styles.tagRow}>
                {DIET_TAGS.map((t) => {
                  const sel = draft.tags.includes(t.value);
                  return (
                    <TouchableOpacity key={t.value} style={[styles.tagChip, sel && styles.tagChipSelected]} onPress={() => toggleTag(t.value)}>
                      <Text style={[styles.tagChipText, sel && styles.tagChipTextSelected]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Chế độ ăn tuỳ chỉnh</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: keto, low FODMAP…"
                placeholderTextColor={colors.onSurfaceVariant}
                value={draft.customDiet ?? ""}
                onChangeText={(v) => setDraft((d) => ({ ...d, customDiet: v }))}
                maxLength={120}
              />

              <View style={styles.servingsRow}>
                <Text style={styles.label}>Khẩu phần</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => setDraft((d) => ({ ...d, servings: Math.max(1, d.servings - 1) }))}>
                    <Text style={styles.stepperBtnText}>–</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{draft.servings} người</Text>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => setDraft((d) => ({ ...d, servings: Math.min(8, d.servings + 1) }))}>
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>Dị ứng / sở thích</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: dị ứng đậu phộng…"
                placeholderTextColor={colors.onSurfaceVariant}
                value={draft.notes ?? ""}
                onChangeText={(v) => setDraft((d) => ({ ...d, notes: v }))}
                maxLength={200}
              />

              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={() => setDraft(DEFAULT_PREFS)}>
                  <Text style={styles.resetLink}>Mặc định</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setOpen(false)}>
                    <Text style={styles.cancelBtnText}>Huỷ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.applyBtn} onPress={apply} disabled={saving}>
                    {saving ? <Loader size={22} color={colors.onPrimary} /> : <Text style={styles.applyBtnText}>Áp dụng</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  trigger: { backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.full, paddingVertical: 10, paddingHorizontal: 16 },
  triggerActive: { backgroundColor: colors.tertiaryContainer },
  triggerText: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 13 },
  triggerTextActive: { color: colors.onTertiaryContainer },
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: shape.xlIncreased, borderTopRightRadius: shape.xlIncreased, padding: 20, maxHeight: "88%" },
  sheetTitle: { ...type.headlineSmall, color: colors.onSurface, fontSize: 20 },
  sheetSubtitle: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 2, marginBottom: 16, fontSize: 12 },
  label: { ...type.labelLarge, color: colors.onSurfaceVariant, marginBottom: 8, marginTop: 4 },
  goalRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  goalCard: { flex: 1, backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.lgIncreased, padding: 12, alignItems: "center" },
  goalCardSelected: { backgroundColor: colors.tertiaryContainer },
  goalLabel: { ...type.titleMedium, color: colors.onSurfaceVariant, fontSize: 13, marginTop: 4, textAlign: "center" },
  goalLabelSelected: { color: colors.onTertiaryContainer },
  goalDesc: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 10, textAlign: "center", marginTop: 2 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tagChip: { backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.full, paddingVertical: 8, paddingHorizontal: 14 },
  tagChipSelected: { backgroundColor: colors.primaryContainer },
  tagChipText: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  tagChipTextSelected: { color: colors.onPrimaryContainer, fontWeight: "700" },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: shape.sm,
    padding: 12,
    marginBottom: 16,
    color: colors.onSurface,
    fontSize: 14,
  },
  servingsRow: { marginBottom: 4 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.primaryContainer,
    borderRadius: shape.full,
    padding: 4,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  stepperBtn: { width: 32, height: 32, borderRadius: shape.full, backgroundColor: colors.surfaceContainerLowest, alignItems: "center", justifyContent: "center" },
  stepperBtnText: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  stepperValue: { ...type.labelLarge, color: colors.onPrimaryContainer, minWidth: 72, textAlign: "center" },
  actionsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  resetLink: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 13 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelBtnText: { ...type.labelLarge, color: colors.onSurfaceVariant },
  applyBtn: { backgroundColor: colors.primary, borderRadius: shape.full, paddingVertical: 10, paddingHorizontal: 20 },
  applyBtnText: { ...type.labelLarge, color: colors.onPrimary },
});
