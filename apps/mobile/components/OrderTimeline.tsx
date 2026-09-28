import { View, Text, StyleSheet } from "react-native";
import { ORDER_TIMELINE, getOrderStatusLabel, type OrderStatus } from "@xanhtantay/types";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { formatClock } from "../constants/format";
import { Icon, isIconName } from "./Icon";

type Step = (typeof ORDER_TIMELINE)[number];
type StepStatus = Step["status"];

// Used only if the bundled icon font predates a name in ORDER_TIMELINE.
const FALLBACK_ICON: Record<StepStatus, string> = { placed: "inventory_2", harvesting: "agriculture", loaded: "local_shipping", delivered: "home" };
const stepIcon = (s: Step) => (isIconName(s.icon) ? s.icon : FALLBACK_ICON[s.status]);

export function statusIcon(status: OrderStatus) {
  if (status === "cancelled") return "cancel";
  const step = ORDER_TIMELINE.find((s) => s.status === status);
  return step ? stepIcon(step) : "schedule";
}

export function statusTone(status: OrderStatus): { bg: string; fg: string } {
  switch (status) {
    case "harvesting":
      return { bg: colors.statusHarvestingBg, fg: colors.statusHarvestingFg };
    case "loaded":
      return { bg: colors.statusLoadedBg, fg: colors.statusLoadedFg };
    case "delivered":
      return { bg: colors.statusDeliveredBg, fg: colors.statusDeliveredFg };
    case "cancelled":
      return { bg: colors.errorContainer, fg: colors.onErrorContainer };
    default:
      return { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer };
  }
}

/** The current emotional status line ("4h00: Rau đang được bác Ba thu hoạch") as a tonal banner. */
export function StatusBanner({ status, farmer }: { status: OrderStatus; farmer?: string | null }) {
  const styles = useStyles(makeStyles);
  const t = statusTone(status);
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }]}>
      <Icon name={statusIcon(status)} size={20} filled color={t.fg} />
      <Text style={[styles.bannerText, { color: t.fg }]}>{getOrderStatusLabel(status, farmer)}</Text>
    </View>
  );
}

export type TimelineStamps = Partial<Record<StepStatus, string | null | undefined>>;

/**
 * The four-step journey with its clock times: 18:00 book closes, 4:00 harvest, 6:00 cold truck,
 * 16:00 building lobby. `stamps` swaps the planned time of a step for the real one once it happened.
 */
export function OrderTimeline({ status, farmer, stamps }: { status: OrderStatus; farmer?: string | null; stamps?: TimelineStamps }) {
  const styles = useStyles(makeStyles);
  const cancelled = status === "cancelled";
  const current = ORDER_TIMELINE.findIndex((s) => s.status === status);

  return (
    <View>
      {ORDER_TIMELINE.map((step, i) => {
        const done = !cancelled && (i < current || status === "delivered");
        const active = !cancelled && i === current && status !== "delivered";
        const reached = done || active;
        const stamp = reached ? stamps?.[step.status] : null;
        const last = i === ORDER_TIMELINE.length - 1;
        return (
          <View key={step.status} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                <Icon name={done ? "check" : stepIcon(step)} size={16} filled={active} color={done ? colors.onPrimary : active ? colors.onPrimaryContainer : colors.onSurfaceVariant} />
              </View>
              {!last && <View style={[styles.line, done && { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[styles.time, reached && { color: colors.primary }]}>{stamp ? formatClock(stamp) : step.time}</Text>
            <View style={[styles.copy, !last && { paddingBottom: 14 }]}>
              <Text style={[styles.short, reached && { color: colors.onSurface }]}>{step.short}</Text>
              <Text style={[styles.label, active && { color: colors.onSurface }]}>{step.label(farmer ?? undefined)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    banner: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: shape.lg },
    bannerText: { ...type.labelLarge, fontSize: 14, flex: 1 },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    rail: { alignItems: "center", alignSelf: "stretch", width: 30 },
    dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceContainerHighest, alignItems: "center", justifyContent: "center" },
    dotDone: { backgroundColor: c.primary },
    dotActive: { backgroundColor: c.primaryContainer, borderWidth: 2, borderColor: c.primary },
    line: { flex: 1, width: 3, minHeight: 10, borderRadius: 2, backgroundColor: c.surfaceContainerHighest, marginVertical: 2 },
    time: { ...type.titleMedium, color: c.onSurfaceVariant, fontSize: 15, lineHeight: 30, width: 50, fontVariant: ["tabular-nums"] },
    copy: { flex: 1, minWidth: 0, paddingTop: 5 },
    short: { ...type.labelLarge, color: c.onSurfaceVariant, fontSize: 13 },
    label: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13, lineHeight: 18, marginTop: 1 },
  });
