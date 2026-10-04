import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { PressableScale } from "./motion";
import { DELIVERY_WEEKDAYS } from "../constants/commerce";

const WEEKDAYS = ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"];
const pad = (n: number) => String(n).padStart(2, "0");

/** The delivery days (Wednesday, Sunday) that can be picked: from the earliest open one, `days` days ahead. */
export function deliveryDays(earliest: string, days = 14) {
  const [y, m, d] = earliest.split("-").map(Number);
  return Array.from({ length: days + 1 }, (_, i) => new Date(y, m - 1, d + i))
    .filter((day) => DELIVERY_WEEKDAYS.includes(day.getDay()))
    .map((day) => ({ value: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`, weekday: WEEKDAYS[day.getDay()], label: `${day.getDate()}/${day.getMonth() + 1}` }));
}

/** Pick the delivery day. Only the day changes: boxes always reach the pickup point at 16h00. */
export function DeliveryDatePicker({ earliest, value, onChange, days = 14, hint }: { earliest: string; value: string; onChange: (day: string) => void; /** how far ahead, in days */ days?: number; hint?: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
        {deliveryDays(earliest, days).map((d, i) => {
          const selected = d.value === value;
          return (
            <PressableScale
              key={d.value}
              haptic
              onPress={() => onChange(d.value)}
              style={[styles.day, selected && styles.daySelected]}
              accessibilityRole="button"
              accessibilityLabel={`Giao ${d.weekday}, ngày ${d.label}${i === 0 ? ", sớm nhất" : ""}`}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.weekday, selected && styles.onSelected]}>{d.weekday}</Text>
              <Text style={[styles.date, selected && styles.onSelected]}>{d.label}</Text>
            </PressableScale>
          );
        })}
      </ScrollView>
      <Text style={styles.hint}>{hint ?? "Chỉ giao thứ Tư và Chủ nhật. Giờ giao luôn là 16h00 tại điểm nhận, chốt sổ 18h00 hôm trước."}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    day: { minWidth: 64, paddingVertical: 10, paddingHorizontal: 12, borderRadius: shape.lg, alignItems: "center", backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.outlineVariant },
    daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    weekday: { ...type.labelLarge, fontSize: 12, color: colors.onSurfaceVariant },
    date: { ...type.titleMedium, fontSize: 16, color: colors.onSurface },
    onSelected: { color: colors.onPrimary },
    hint: { ...type.bodyMedium, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 8 },
  });
