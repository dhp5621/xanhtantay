import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import type { Order, OrderStatus } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../../constants/api";
import { colors, shape, type } from "../../../constants/theme";
import { formatVnd, ORDER_TYPE_LABELS } from "../../../constants/commerce";

type FarmerOrder = Order & {
  customer_name?: string | null;
  customer_phone?: string | null;
  items?: { id: string; product_name?: string | null; product_unit?: string | null; quantity: string | number }[];
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  harvesting: "Đang thu hoạch",
  loaded: "Đã lên xe",
  delivered: "Đã giao",
};
const STATUS_STYLE: Record<OrderStatus, { bg: string; fg: string }> = {
  harvesting: { bg: colors.statusHarvestingBg, fg: colors.statusHarvestingFg },
  loaded: { bg: colors.statusLoadedBg, fg: colors.statusLoadedFg },
  delivered: { bg: colors.statusDeliveredBg, fg: colors.statusDeliveredFg },
};
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  harvesting: { status: "loaded", label: "Đã lên xe" },
  loaded: { status: "delivered", label: "Đã giao" },
};

export default function FarmerDonHangScreen() {
  const [orders, setOrders] = useState<FarmerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await apiFetch("/orders"));
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const advance = async (order: FarmerOrder) => {
    const next = NEXT[order.status];
    if (!next) return;
    setUpdating(order.id);
    try {
      await apiFetch(`/orders/${order.id}/status`, { method: "PATCH", body: JSON.stringify({ status: next.status }) });
      setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, status: next.status } : o)));
    } catch (e) {
      Alert.alert("Không cập nhật được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setUpdating(null);
    }
  };

  const pending = orders.filter((o) => o.status !== "delivered").length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đơn hàng 📦</Text>
      <Text style={styles.subtitle}>{pending > 0 ? `${pending} đơn cần xử lý` : "Mọi đơn đã giao"}</Text>
      {loading && <ActivityIndicator color={colors.primary} />}
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[colors.primary]} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={!loading ? <Text style={styles.placeholderText}>Chưa có đơn hàng nào.</Text> : null}
        renderItem={({ item }) => {
          const s = STATUS_STYLE[item.status];
          const next = NEXT[item.status];
          return (
            <View style={[styles.card, item.status === "delivered" && { opacity: 0.75 }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.customerName}>{item.customer_name ?? "Khách hàng"}</Text>
                  <Text style={styles.customerMeta}>{item.customer_phone ?? "—"} · {ORDER_TYPE_LABELS[item.type] ?? item.type}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.total}>{formatVnd(item.total)}</Text>
                  <View style={[styles.statusChip, { backgroundColor: s.bg }]}>
                    <Text style={[styles.statusText, { color: s.fg }]}>{STATUS_LABEL[item.status]}</Text>
                  </View>
                </View>
              </View>
              {!!item.items?.length && (
                <View style={styles.itemsRow}>
                  {item.items.map((l) => (
                    <View key={l.id} style={styles.itemChip}>
                      <Text style={styles.itemChipText}>{l.quantity} {l.product_unit} {l.product_name}</Text>
                    </View>
                  ))}
                </View>
              )}
              {item.note ? <Text style={styles.note}>📝 {item.note}</Text> : null}
              {next && (
                <TouchableOpacity style={styles.advanceBtn} disabled={updating === item.id} onPress={() => advance(item)}>
                  {updating === item.id ? <ActivityIndicator color={colors.onPrimaryContainer} /> : <Text style={styles.advanceBtnText}>{next.label}</Text>}
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, paddingTop: 16, paddingHorizontal: 16 },
  title: { ...type.headlineSmall, color: colors.onSurface },
  subtitle: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 2, marginBottom: 12 },
  placeholderText: { ...type.bodyMedium, color: colors.onSurfaceVariant },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  customerName: { ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
  customerMeta: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  total: { ...type.titleMedium, color: colors.primary, fontSize: 16 },
  statusChip: { marginTop: 4, paddingVertical: 3, paddingHorizontal: 9, borderRadius: shape.full },
  statusText: { fontSize: 11, fontWeight: "700" },
  itemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  itemChip: { backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.full, paddingVertical: 4, paddingHorizontal: 10 },
  itemChipText: { fontSize: 12, color: colors.onSurface, fontWeight: "600" },
  note: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 8, fontSize: 12 },
  advanceBtn: { marginTop: 12, alignSelf: "flex-start", backgroundColor: colors.primaryContainer, borderRadius: shape.full, paddingVertical: 8, paddingHorizontal: 16 },
  advanceBtnText: { color: colors.onPrimaryContainer, fontWeight: "700" },
});
