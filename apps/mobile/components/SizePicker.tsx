import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import type { Box } from "@xanhtantay/types";
import { shape, type, useStyles, type Colors } from "../constants/theme";
import { formatKg, formatVND } from "../constants/format";
import { PressableScale } from "./motion";

type SizeBrief = Pick<Box, "id" | "slug" | "size" | "weight_kg" | "servings" | "price">;

/** The sizes of one mix, picked like clothing: letter, weight · servings and price. */
export function SizePicker({ mixName, sizes, current, onPick, style }: { mixName: string; sizes: SizeBrief[]; current?: string; onPick: (box: SizeBrief) => void; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.row, style]}>
      {sizes.map((b) => {
        const selected = b.id === current;
        return (
          <PressableScale
            key={b.id}
            haptic
            style={[styles.size, selected && styles.sizeSelected]}
            onPress={() => onPick(b)}
            accessibilityRole="button"
            accessibilityLabel={`${mixName}, size ${b.size}, ${formatKg(b.weight_kg)}, ${formatVND(b.price)}`}
            accessibilityState={current === undefined ? undefined : { selected }}
          >
            <Text style={[styles.letter, selected && styles.onSelected]}>{b.size}</Text>
            <Text style={[styles.meta, selected && styles.onSelected]} numberOfLines={1}>
              {formatKg(b.weight_kg)}
            </Text>
            <Text style={[styles.meta, selected && styles.onSelected]} numberOfLines={1}>
              {b.servings} người
            </Text>
            <Text style={[styles.price, selected && styles.onSelected]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {formatVND(b.price)}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    row: { flexDirection: "row", gap: 8 },
    size: { flex: 1, minWidth: 0, alignItems: "center", gap: 2, paddingVertical: 10, paddingHorizontal: 4, borderRadius: shape.lg, backgroundColor: c.surfaceContainerHigh, borderWidth: 1, borderColor: c.outlineVariant },
    sizeSelected: { backgroundColor: c.primaryContainer, borderWidth: 2, borderColor: c.primary, borderRadius: shape.xl },
    onSelected: { color: c.onPrimaryContainer },
    letter: { color: c.onSurface, fontWeight: "700", fontSize: 20, lineHeight: 24, includeFontPadding: false },
    meta: { ...type.bodyMedium, color: c.onSurface, fontSize: 12, lineHeight: 16, fontWeight: "500", textAlign: "center" },
    price: { ...type.labelLarge, color: c.primary, fontSize: 13, lineHeight: 18 },
  });
