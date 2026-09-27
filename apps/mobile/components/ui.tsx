import type { ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { colors, shape, type, elevation, useStyles } from "../constants/theme";
import { PressableScale } from "./motion";
import { Icon } from "./Icon";
import type { Colors } from "../constants/theme";

/** Tab screens have no header, so they take the top inset themselves (Android is edge-to-edge in SDK 54). */
export function Screen({ children, style, edges = ["top"] }: { children: ReactNode; style?: StyleProp<ViewStyle>; edges?: Edge[] }) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.surface }, style]}>
      {children}
    </SafeAreaView>
  );
}

/** Eyebrow + title + subtitle block (`PageHeader`). */
export function PageHeader({ icon, eyebrow, title, subtitle, right }: { icon?: string; eyebrow?: string; title: string; subtitle?: string; right?: ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
      {icon ? (
        <View style={styles.headerIcon}>
          <Icon name={icon} size={26} filled color={colors.onPrimaryContainer} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={{ ...type.headlineSmall, color: colors.onSurface }}>{title}</Text>
        {subtitle ? <Text style={{ ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** `.m3-section-head` */
export function SectionHead({ icon, title, action, onAction }: { icon?: string; title: string; action?: string; onAction?: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.sectionHead}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
        {icon ? <Icon name={icon} size={24} filled color={colors.primary} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text style={styles.sectionAction}>{action}</Text>
          <Icon name="arrow_forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/** `.m3-empty` */
export function EmptyState({ icon, title, description, action }: { icon: string; title: string; description?: string; action?: ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={36} color={colors.onSurfaceVariant} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDesc}>{description}</Text> : null}
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}

type Tone = "surface" | "primary" | "secondary" | "tertiary" | "error";
const tones = (): Record<Tone, { bg: string; fg: string }> => ({
  surface: { bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant },
  primary: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
  secondary: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
  tertiary: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer },
  error: { bg: colors.errorContainer, fg: colors.onErrorContainer },
});

/** `.m3-chip` — tonal pill; `selected` flips to primary. */
export function Chip({ label, icon, tone = "surface", selected, small, onPress, style }: { label: string; icon?: string; tone?: Tone; selected?: boolean; small?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles(makeStyles);
  const t = selected ? { bg: colors.primary, fg: colors.onPrimary } : tones()[tone];
  const inner = (
    <View style={[styles.chip, small && styles.chipSmall, { backgroundColor: t.bg }, style]}>
      {icon ? <Icon name={icon} size={small ? 14 : 18} color={t.fg} filled={selected} style={{ flexShrink: 0 }} /> : null}
      <Text style={[styles.chipText, small && styles.chipTextSmall, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) return inner;
  return (
    <PressableScale onPress={onPress} scaleTo={0.94} style={{ alignSelf: "flex-start", flexShrink: 0 }}>
      {inner}
    </PressableScale>
  );
}

/** Filled / tonal / outlined / text buttons — `.m3-btn` variants. */
export function Button({ label, onPress, variant = "filled", disabled, loading, icon, style, small }: { label: string; onPress?: () => void; variant?: "filled" | "tonal" | "outlined" | "text" | "tertiary" | "error"; disabled?: boolean; loading?: boolean; icon?: string; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const styles = useStyles(makeStyles);
  const v = {
    filled: { bg: colors.primary, fg: colors.onPrimary, border: "transparent" },
    tonal: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer, border: "transparent" },
    tertiary: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer, border: "transparent" },
    outlined: { bg: "transparent", fg: colors.primary, border: colors.outline },
    text: { bg: "transparent", fg: colors.primary, border: "transparent" },
    error: { bg: "transparent", fg: colors.error, border: colors.error },
  }[variant];
  return (
    <PressableScale onPress={onPress} disabled={disabled || loading} haptic style={[styles.btn, small && styles.btnSmall, { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.border === "transparent" ? 0 : 1.5 }, style]}>
      {icon && !loading ? <Icon name={icon} size={small ? 18 : 20} color={v.fg} filled={variant === "filled"} style={{ flexShrink: 0 }} /> : null}
      <Text numberOfLines={1} style={[styles.btnText, small && styles.btnTextSmall, { color: v.fg }]}>{loading ? "Đang xử lý…" : label}</Text>
    </PressableScale>
  );
}

/** Stat tile used on the account / loyalty / farmer dashboards. */
export function StatTile({ icon, value, label, desc, onPress, tone = "surface", style }: { icon: string; value: string | number; label: string; desc?: string; onPress?: () => void; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles(makeStyles);
  const t = tones()[tone];
  const fg = tone === "surface" ? colors.primary : t.fg;
  const body = (
    <View style={[styles.stat, { backgroundColor: tone === "surface" ? colors.surfaceContainerLow : t.bg }, style]}>
      <Icon name={icon} size={24} filled color={fg} />
      <Text style={[styles.statValue, tone !== "surface" && { color: t.fg }]}>{value}</Text>
      <Text style={[styles.statLabel, tone !== "surface" && { color: t.fg }]}>{label}</Text>
      {desc ? <Text style={[styles.statDesc, tone !== "surface" && { color: t.fg, opacity: 0.8 }]}>{desc}</Text> : null}
    </View>
  );
  return onPress ? <PressableScale onPress={onPress} style={{ flex: 1 }}>{body}</PressableScale> : <View style={{ flex: 1 }}>{body}</View>;
}

/** Circular avatar with initial fallback. */
export function Avatar({ name, src, size = 40, tone = "primary" }: { name?: string | null; src?: string | null; size?: number; tone?: "primary" | "tertiary" }) {
  const bg = tone === "primary" ? colors.primary : colors.tertiary;
  return src ? (
    <Image source={{ uri: src }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceContainerHighest }} transition={200} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.42 }}>{(name ?? "?").trim().charAt(0).toUpperCase() || "?"}</Text>
    </View>
  );
}

/** `.m3-list-item` — leading icon bubble, title/desc, chevron. */
export function ListItem({ icon, title, desc, onPress, trailing, tone = "surface" }: { icon: string; title: string; desc?: string; onPress?: () => void; trailing?: ReactNode; tone?: Tone }) {
  const styles = useStyles(makeStyles);
  const t = tones()[tone];
  const leadingBg = tone === "surface" ? colors.primaryContainer : t.bg;
  const leadingFg = tone === "surface" ? colors.onPrimaryContainer : t.fg;
  return (
    <PressableScale onPress={onPress} disabled={!onPress} style={[styles.listItem, elevation[1]]}>
      <View style={[styles.listLeading, { backgroundColor: leadingBg }]}>
        <Icon name={icon} size={22} color={leadingFg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {desc ? <Text style={styles.listDesc}>{desc}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Icon name="chevron_right" size={24} color={colors.onSurfaceVariant} /> : null)}
    </PressableScale>
  );
}

/** Leading icon bubble on its own (`.m3-list-leading`). */
export function Leading({ icon, tone = "primary", size = 44, filled }: { icon: string; tone?: Tone; size?: number; filled?: boolean }) {
  const t = tone === "surface" ? { bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant } : tones()[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: shape.md, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={size * 0.52} color={t.fg} filled={filled} />
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  headerIcon: { width: 48, height: 48, borderRadius: shape.md, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center", marginTop: 2 },
  eyebrow: { ...type.labelLarge, color: colors.primary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 },
  sectionTitle: { ...type.titleLarge, color: colors.onSurface, fontSize: 20, flexShrink: 1 },
  sectionAction: { ...type.labelLarge, color: colors.primary, fontSize: 13 },
  empty: { alignItems: "center", padding: 28, backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceContainerHighest, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { ...type.titleLarge, color: colors.onSurface, textAlign: "center", fontSize: 18 },
  emptyDesc: { ...type.bodyMedium, color: colors.onSurfaceVariant, textAlign: "center", marginTop: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: shape.full, alignSelf: "flex-start", flexShrink: 0 },
  chipSmall: { paddingVertical: 4, paddingHorizontal: 10, gap: 4, flexShrink: 0 },
  chipText: { ...type.labelLarge, fontSize: 13, lineHeight: 18, flexShrink: 0, includeFontPadding: false },
  chipTextSmall: { fontSize: 11, lineHeight: 16, flexShrink: 0, includeFontPadding: false },
  btn: { flexDirection: "row", gap: 8, paddingVertical: 14, paddingHorizontal: 22, borderRadius: shape.full, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", flexShrink: 0 },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 16, gap: 6, flexShrink: 0 },
  btnText: { ...type.labelLarge, fontSize: 15, lineHeight: 22, flexShrink: 0, includeFontPadding: false },
  btnTextSmall: { fontSize: 13, lineHeight: 18, flexShrink: 0, includeFontPadding: false },
  stat: { borderRadius: shape.lgIncreased, padding: 14, gap: 2 },
  statValue: { ...type.headlineSmall, color: colors.onSurface, fontSize: 22, lineHeight: 28, marginTop: 4 },
  statLabel: { ...type.titleMedium, color: colors.onSurface, fontSize: 13, lineHeight: 18 },
  statDesc: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 11, lineHeight: 15 },
  listItem: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 14, marginBottom: 10 },
  listLeading: { width: 44, height: 44, borderRadius: shape.md, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  listTitle: { ...type.titleMedium, color: colors.onSurface, fontSize: 15, includeFontPadding: false },
  listDesc: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 1 },
});
