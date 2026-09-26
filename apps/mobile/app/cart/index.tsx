import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useCart } from "../../hooks/useCart";
import { useSession } from "../../hooks/useSession";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation } from "../../constants/theme";
import { MIN_DIRECT_ORDER, formatVnd, pointsFor } from "../../constants/commerce";

export default function CartScreen() {
  const cart = useCart();
  const { user } = useSession();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<{ farm_name: string; total: number }[] | null>(null);

  const checkout = async () => {
    if (!user) {
      router.push("/dang-nhap");
      return;
    }
    setSubmitting(true);
    const batch_id = `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const done: { farm_name: string; total: number }[] = [];
    try {
      for (const g of cart.groups) {
        try {
          const data = await apiFetch("/orders", {
            method: "POST",
            body: JSON.stringify({
              farm_id: g.farm_id,
              note: note.trim() || undefined,
              batch_id,
              items: g.lines.map((l) => ({ product_id: l.id, quantity: l.quantity })),
            }),
          });
          done.push({ farm_name: g.farm_name, total: data.total });
          cart.clearFarm(g.farm_id);
        } catch (e) {
          Alert.alert(g.farm_name, e instanceof Error ? e.message : "Không đặt được đơn này");
        }
      }
      if (done.length) {
        setPlaced(done);
        setNote("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (placed) {
    const total = placed.reduce((s, o) => s + o.total, 0);
    return (
      <View style={styles.container}>
        <View style={[styles.successCard, elevation[1]]}>
          <Text style={{ fontSize: 40 }}>✅</Text>
          <Text style={styles.successTitle}>{placed.length > 1 ? `Đã đặt ${placed.length} đơn!` : "Đặt hàng thành công!"}</Text>
          <Text style={styles.successBody}>Bác nông dân sẽ hái đúng phần của bạn. Bạn vừa tích được <Text style={{ fontWeight: "700" }}>{pointsFor(total)} điểm</Text>.</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace("/tabs/don-hang")}>
          <Text style={styles.primaryBtnText}>Xem đơn hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Tiếp tục mua</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 40, marginBottom: 8 }}>🧺</Text>
        <Text style={styles.emptyTitle}>Giỏ còn trống</Text>
        <Text style={styles.emptyBody}>Ghé một vườn rau và chọn vài món tươi nhé.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace("/tabs/farms")}>
          <Text style={styles.primaryBtnText}>Xem vườn rau</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={cart.groups}
      keyExtractor={(g) => g.farm_id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      ListHeaderComponent={<Text style={styles.title}>Giỏ rau của bạn</Text>}
      renderItem={({ item: g }) => (
        <View style={{ marginBottom: 16 }}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupName}>🪴 {g.farm_name}</Text>
            <TouchableOpacity
              onPress={() => {
                if (!user) {
                  router.push("/dang-nhap");
                  return;
                }
                Alert.alert("Đặt định kỳ", "Chọn tần suất giao hàng cho các món đang có trong giỏ của vườn này.", [
                  { text: "Huỷ", style: "cancel" },
                  {
                    text: "Hàng tuần",
                    onPress: () =>
                      apiFetch("/subscriptions", {
                        method: "POST",
                        body: JSON.stringify({ farm_id: g.farm_id, frequency: "weekly", items: g.lines.map((l) => ({ product_id: l.id, quantity: l.quantity })) }),
                      })
                        .then(() => Alert.alert("Đã tạo gói định kỳ hàng tuần!"))
                        .catch((e) => Alert.alert("Lỗi", e instanceof Error ? e.message : "Có lỗi xảy ra")),
                  },
                  {
                    text: "Hàng tháng",
                    onPress: () =>
                      apiFetch("/subscriptions", {
                        method: "POST",
                        body: JSON.stringify({ farm_id: g.farm_id, frequency: "monthly", items: g.lines.map((l) => ({ product_id: l.id, quantity: l.quantity })) }),
                      })
                        .then(() => Alert.alert("Đã tạo gói định kỳ hàng tháng!"))
                        .catch((e) => Alert.alert("Lỗi", e instanceof Error ? e.message : "Có lỗi xảy ra")),
                  },
                ]);
              }}
            >
              <Text style={styles.subscribeLink}>Đặt định kỳ</Text>
            </TouchableOpacity>
            {g.subtotal < MIN_DIRECT_ORDER ? (
              <View style={[styles.chip, { backgroundColor: colors.tertiaryContainer }]}>
                <Text style={[styles.chipText, { color: colors.onTertiaryContainer }]}>Ghép đơn</Text>
              </View>
            ) : (
              <View style={[styles.chip, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.chipText, { color: colors.onPrimaryContainer }]}>Giao riêng</Text>
              </View>
            )}
          </View>
          {g.lines.map((l) => (
            <View key={l.id} style={styles.lineRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.lineName} numberOfLines={1}>{l.name}</Text>
                <Text style={styles.linePrice}>{formatVnd(l.price_per_unit)} / {l.unit}</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => cart.setQty(l.id, l.quantity - 1)}>
                  <Text style={styles.stepperBtnText}>{l.quantity === 1 ? "✕" : "–"}</Text>
                </TouchableOpacity>
                <Text style={styles.stepperQty}>{l.quantity}</Text>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => cart.setQty(l.id, l.quantity + 1)}>
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.lineTotal}>{formatVnd(l.price_per_unit * l.quantity)}</Text>
            </View>
          ))}
          <Text style={styles.subtotal}>Vườn này: {formatVnd(g.subtotal)}</Text>
        </View>
      )}
      ListFooterComponent={
        <>
          {cart.groups.some((g) => g.subtotal < MIN_DIRECT_ORDER) && (
            <View style={styles.pooledNote}>
              <Text style={styles.pooledNoteText}>
                Đơn dưới {formatVnd(MIN_DIRECT_ORDER)} mỗi vườn sẽ được ghép chuyến với hàng xóm để tiết kiệm phí, giao trong 1–2 ngày.
              </Text>
            </View>
          )}
          <TextInput
            style={styles.noteInput}
            placeholder="Ghi chú cho bác nông dân…"
            placeholderTextColor={colors.onSurfaceVariant}
            value={note}
            onChangeText={setNote}
            maxLength={200}
          />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{cart.groups.length > 1 ? `${cart.groups.length} đơn` : `${cart.count} món`}</Text>
            <Text style={styles.totalValue}>{formatVnd(cart.total)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} disabled={submitting} onPress={checkout}>
            {submitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.checkoutBtnText}>{user ? (cart.groups.length > 1 ? `Đặt ${cart.groups.length} đơn` : "Đặt hàng ngay") : "Đăng nhập để đặt"}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.codNote}>Thanh toán khi nhận hàng (COD). Mỗi đơn giao xong tích 1 điểm / 1.000₫.</Text>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { ...type.headlineSmall, color: colors.onSurface, marginBottom: 16 },
  emptyTitle: { ...type.titleLarge, color: colors.onSurface, marginBottom: 4 },
  emptyBody: { ...type.bodyMedium, color: colors.onSurfaceVariant, textAlign: "center", marginBottom: 20 },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 },
  groupName: { ...type.labelLarge, color: colors.primary, fontSize: 15, flex: 1 },
  subscribeLink: { color: colors.secondary, fontWeight: "700", fontSize: 12 },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: shape.full },
  chipText: { fontSize: 11, fontWeight: "700" },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: shape.lg,
    padding: 12,
    marginBottom: 8,
  },
  lineName: { ...type.titleMedium, color: colors.onSurface, fontSize: 14 },
  linePrice: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.full },
  stepperBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  stepperBtnText: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  stepperQty: { minWidth: 24, textAlign: "center", fontWeight: "700", color: colors.onSurface },
  lineTotal: { ...type.labelLarge, color: colors.primary, minWidth: 76, textAlign: "right" },
  subtotal: { ...type.bodyMedium, color: colors.onSurfaceVariant, textAlign: "right", marginTop: 2 },
  pooledNote: { backgroundColor: colors.tertiaryContainer, borderRadius: shape.md, padding: 12, marginBottom: 14 },
  pooledNoteText: { ...type.bodyMedium, color: colors.onTertiaryContainer, fontSize: 13 },
  noteInput: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: shape.md,
    padding: 12,
    color: colors.onSurface,
    marginBottom: 14,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  totalLabel: { ...type.bodyLarge, color: colors.onSurfaceVariant },
  totalValue: { ...type.headlineSmall, color: colors.primary },
  checkoutBtn: { backgroundColor: colors.primary, borderRadius: shape.full, padding: 16, alignItems: "center" },
  checkoutBtnText: { ...type.labelLarge, color: colors.onPrimary, fontSize: 16 },
  codNote: { ...type.bodyMedium, color: colors.onSurfaceVariant, textAlign: "center", marginTop: 10, fontSize: 12 },
  successCard: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 28, marginBottom: 20 },
  successTitle: { ...type.titleLarge, color: colors.onSurface, marginTop: 8 },
  successBody: { ...type.bodyMedium, color: colors.onSurfaceVariant, textAlign: "center", marginTop: 8 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: shape.full, padding: 14, alignItems: "center", marginBottom: 10 },
  primaryBtnText: { ...type.labelLarge, color: colors.onPrimary },
  secondaryBtn: { padding: 14, alignItems: "center" },
  secondaryBtnText: { ...type.labelLarge, color: colors.onSurfaceVariant },
});
