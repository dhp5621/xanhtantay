import { View, Text, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, shape, type, useStyles } from "../constants/theme";
import { PressableScale } from "./motion";
import { useCart, type CartProduct } from "../hooks/useCart";
import type { Colors } from "../constants/theme";

/** Mirrors apps/web/src/components/cart/AddToCartButton.tsx (compact): "+ Thêm" → − qty +. */
export function CartStepper({ product, max, compact }: { product: CartProduct; max?: number; compact?: boolean }) {
  const styles = useStyles(makeStyles);
  const cart = useCart();
  const qty = cart.qtyOf(product.id);
  const tick = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  };
  const atMax = max !== undefined && qty >= max;

  if (qty === 0) {
    return (
      <PressableScale
        haptic
        scaleTo={0.92}
        style={[styles.addBtn, compact && styles.addBtnCompact]}
        onPress={() => cart.add(product)}
      >
        <Text style={[styles.addBtnText, compact && { fontSize: 12 }]}>+ Thêm</Text>
      </PressableScale>
    );
  }
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <PressableScale
        scaleTo={0.85}
        style={[styles.btn, compact && styles.btnCompact]}
        onPress={() => {
          tick();
          cart.setQty(product.id, qty - 1);
        }}
      >
        <Text style={styles.btnText}>{qty === 1 ? "✕" : "–"}</Text>
      </PressableScale>
      <Text style={[styles.qty, compact && { minWidth: 20, fontSize: 13 }]}>{qty}</Text>
      <PressableScale
        scaleTo={0.85}
        disabled={atMax}
        style={[styles.btn, styles.btnFilled, compact && styles.btnCompact]}
        onPress={() => {
          tick();
          cart.add(product);
        }}
      >
        <Text style={[styles.btnText, { color: colors.onPrimary }]}>+</Text>
      </PressableScale>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  addBtn: { backgroundColor: colors.primary, borderRadius: shape.full, paddingVertical: 8, paddingHorizontal: 16 },
  addBtnCompact: { paddingVertical: 7, paddingHorizontal: 12 },
  addBtnText: { ...type.labelLarge, color: colors.onPrimary, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryContainer, borderRadius: shape.full, padding: 3, gap: 2 },
  rowCompact: { padding: 2 },
  btn: { width: 30, height: 30, borderRadius: shape.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceContainerLowest },
  btnCompact: { width: 26, height: 26 },
  btnFilled: { backgroundColor: colors.primary },
  btnText: { fontSize: 16, fontWeight: "700", color: colors.onSurface, lineHeight: 18 },
  qty: { minWidth: 24, textAlign: "center", fontWeight: "800", color: colors.onPrimaryContainer, fontSize: 14 },
});
