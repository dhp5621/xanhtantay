import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import type { Order, OrderStatus } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../constants/api";
import { useSession } from "../../hooks/useSession";
import { colors, shape, type } from "../../constants/theme";

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

function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

export default function DonHangScreen() {
  const { user, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setOrders(await apiFetch("/orders"));
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? null : e instanceof Error ? e.message : "Không tải được dữ liệu");
    }
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    load().finally(() => setLoading(false));
  }, [sessionLoading, user, load]);

  if (!sessionLoading && !user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Đơn hàng 📦</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Đăng nhập để xem đơn hàng của bạn.</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push("/dang-nhap")}>
            <Text style={styles.loginBtnText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đơn hàng 📦</Text>
      {(loading || sessionLoading) && <ActivityIndicator color={colors.primary} />}
      {error && <Text style={styles.errorText}>{error}</Text>}
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Bạn chưa có đơn hàng nào.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const s = STATUS_STYLE[item.status];
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
                <View style={[styles.statusChip, { backgroundColor: s.bg }]}>
                  <Text style={[styles.statusText, { color: s.fg }]}>{STATUS_LABEL[item.status]}</Text>
                </View>
              </View>
              <Text style={styles.total}>{formatVnd(item.total)}</Text>
              {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, paddingTop: 24, paddingHorizontal: 16 },
  title: { ...type.headlineSmall, color: colors.onSurface, marginBottom: 16 },
  errorText: { color: colors.error, marginBottom: 8 },
  placeholder: { padding: 20, backgroundColor: colors.surfaceContainer, borderRadius: shape.lg },
  placeholderText: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginBottom: 12 },
  loginBtn: { backgroundColor: colors.primary, borderRadius: shape.full, padding: 12, alignItems: "center" },
  loginBtnText: { ...type.labelLarge, color: colors.onPrimary },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: shape.lg,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  orderId: { ...type.titleMedium, color: colors.onSurface, fontSize: 14 },
  statusChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: shape.full },
  statusText: { fontSize: 12, fontWeight: "700" },
  total: { ...type.titleMedium, color: colors.primary, fontSize: 17 },
  note: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 4 },
});
