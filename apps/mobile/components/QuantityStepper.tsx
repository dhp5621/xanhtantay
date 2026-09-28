import { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { MAX_BOX_QUANTITY } from "../constants/commerce";
import { PressableScale } from "./motion";
import { Icon } from "./Icon";

/** − number + ; the number can also be typed. Out-of-range input snaps back when the field loses focus. */
export function QuantityStepper({ value, onChange, min = 1, max = MAX_BOX_QUANTITY, unit = "hộp" }: { value: number; onChange: (n: number) => void; min?: number; max?: number; unit?: string }) {
  const styles = useStyles(makeStyles);
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const step = (delta: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onChange(clamp(value + delta));
  };

  return (
    <View style={styles.wrap}>
      <PressableScale scaleTo={0.85} disabled={value <= min} style={styles.btn} onPress={() => step(-1)} accessibilityLabel="Giảm số lượng">
        <Icon name="remove" size={20} color={colors.onSurface} />
      </PressableScale>
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={text}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={3}
          selectTextOnFocus
          onChangeText={(t) => {
            const digits = t.replace(/\D/g, "");
            setText(digits);
            const n = parseInt(digits, 10);
            if (!Number.isNaN(n) && n >= min && n <= max) onChange(n);
          }}
          onBlur={() => {
            const n = parseInt(text, 10);
            const v = clamp(Number.isNaN(n) ? min : n);
            setText(String(v));
            if (v !== value) onChange(v);
          }}
          accessibilityLabel="Số lượng"
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <PressableScale scaleTo={0.85} disabled={value >= max} style={[styles.btn, styles.btnFilled]} onPress={() => step(1)} accessibilityLabel="Tăng số lượng">
        <Icon name="add" size={20} color={colors.onPrimary} />
      </PressableScale>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    wrap: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.primaryContainer, borderRadius: shape.full, padding: 4, alignSelf: "flex-start" },
    btn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceContainerLowest, alignItems: "center", justifyContent: "center" },
    btnFilled: { backgroundColor: c.primary },
    field: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6 },
    input: { minWidth: 40, paddingVertical: 0, paddingHorizontal: 2, textAlign: "center", ...type.titleMedium, fontSize: 18, lineHeight: 24, color: c.onPrimaryContainer },
    unit: { ...type.bodyMedium, color: c.onPrimaryContainer, fontSize: 13, opacity: 0.8 },
  });
