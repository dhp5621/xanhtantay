import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import type { Subscription } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type } from "../../constants/theme";
import { formatVnd } from "../../constants/commerce";

const FREQ_LABEL: Record<string, string> = { weekly: "Hàng tuần", monthly: "Hàng tháng" };

export default function DinhKyScreen() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSubs(await apiFetch("/subscriptions"));
    } catch {
      // ignore; empty state / login prompt covers it
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const toggleActive = async (s: Subscription) => {
    setBusy(s.id);
    try {
      await apiFetch("/subscriptions", { method: "PATCH", body: JSON.stringify({ id: s.id, active: !s.active }) });
      setSubs((xs) => xs.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
    } catch (e) {
      Alert.alert("Lỗi", e instanceof ApiError ? e.message : "Không cập nhật được");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đơn định kỳ 🔄</Text>
      <Text style={styles.subtitle}>Rau được giao đều đặn, không cần đặt lại mỗi lần. Tạo gói mới bằng cách thêm sản phẩm vào giỏ ở trang vườn, rồi liên hệ nhà vườn để chuyển sang định kỳ.</Text>
      <FlatList
        data={subs}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        ListEmptyComponent={<Text style={styles.placeholderText}>Bạn chưa có gói định kỳ nào.</Text>}
        renderItem={({ item: s }) => (
          <View style={[styles.card, !s.active && { opacity: 0.6 }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.freq}>{FREQ_LABEL[s.frequency] ?? s.frequency}</Text>
              <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: s.active ? colors.primaryContainer : colors.errorContainer }]} disabled={busy === s.id} onPress={() => toggleActive(s)}>
                <Text style={{ color: s.active ? colors.onPrimaryContainer : colors.onErrorContainer, fontWeight: "700", fontSize: 12 }}>
                  {s.active ? "Đang hoạt động" : "Đã tạm dừng"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.nextDelivery}>Giao tiếp theo: {new Date(s.next_delivery).toLocaleDateString("vi-VN")}</Text>
            <View style={styles.itemsRow}>
              {s.items.map((it, i) => (
                <View key={i} style={styles.itemChip}>
                  <Text style={styles.itemChipText}>{it.quantity} × sản phẩm</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  title: { ...type.headlineSmall, color: colors.onSurface },
  subtitle: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 6, fontSize: 13 },
  placeholderText: { ...type.bodyMedium, color: colors.onSurfaceVariant },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  freq: { ...type.titleMedium, color: colors.onSurface, fontSize: 14 },
  toggleBtn: { borderRadius: shape.full, paddingVertical: 5, paddingHorizontal: 10 },
  nextDelivery: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 6 },
  itemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  itemChip: { backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.full, paddingVertical: 4, paddingHorizontal: 10 },
  itemChipText: { fontSize: 12, color: colors.onSurface, fontWeight: "600" },
});
