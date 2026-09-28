import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { CUTOFF_LABEL } from "../constants/commerce";
import { formatCountdown, formatDay, relativeDayOf } from "../constants/format";
import { useCountdown } from "../hooks/useCountdown";
import { Icon } from "./Icon";

/** "Đặt trước 18h00 hôm nay, giao Thứ Ba, 29 tháng 9" with a live countdown to the cut-off. */
export function CutoffBanner({ cutoffAt, deliveryDate, style }: { cutoffAt: string; deliveryDate: string; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles(makeStyles);
  const left = useCountdown(cutoffAt);
  const countdown = formatCountdown(left);
  const urgent = left > 0 && left < 60 * 60 * 1000;
  return (
    <View style={[styles.wrap, urgent && { backgroundColor: colors.statusHarvestingBg }, style]}>
      <View style={[styles.icon, urgent && { backgroundColor: colors.statusHarvestingFg }]}>
        <Icon name="schedule" size={22} filled color={urgent ? colors.statusHarvestingBg : colors.onTertiary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.title, urgent && { color: colors.statusHarvestingFg }]}>
          Đặt trước {CUTOFF_LABEL} {relativeDayOf(cutoffAt)}, giao {formatDay(deliveryDate)}
        </Text>
        <Text style={[styles.sub, urgent && { color: colors.statusHarvestingFg }]}>
          {countdown ? `Còn ${countdown} nữa là chốt sổ gửi lệnh về vườn` : "Đang chốt sổ, đơn đặt lúc này sẽ vào chuyến kế tiếp"}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    wrap: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.tertiaryContainer, borderRadius: shape.xl, padding: 16 },
    icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.tertiary, alignItems: "center", justifyContent: "center" },
    title: { ...type.titleMedium, color: c.onTertiaryContainer, fontSize: 15, lineHeight: 21 },
    sub: { ...type.bodyMedium, color: c.onTertiaryContainer, fontSize: 13, opacity: 0.85, marginTop: 2, fontVariant: ["tabular-nums"] },
  });
