import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Order, OrderStatus } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../constants/api";
import { useSession } from "../../hooks/useSession";
import { colors, shape, type, elevation } from "../../constants/theme";
import { formatDateTime, formatVND, STATUS_ICONS } from "../../constants/format";
import { ORDER_TYPE_LABELS } from "../../constants/commerce";
import { AnimIn, Skeleton } from "../../components/motion";
import { Button, Chip, EmptyState, PageHeader, Screen } from "../../components/ui";
import { Icon } from "../../components/Icon";

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
const STEPS: OrderStatus[] = ["harvesting", "loaded", "delivered"];

type MyOrder = Order & { delivery_mode?: string };

/** Mirrors apps/web/src/app/(customer)/don-hang/page.tsx. */
export default function DonHangScreen() {
  const { user, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    try {
      setError(null);
      setOrders(await apiFetch("/orders"));
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? null : e instanceof Error ? e.message : "Không tải được dữ liệu");
      setOrders((o) => o ?? []);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!sessionLoading) load();
    }, [sessionLoading, load])
  );

  if (!sessionLoading && !user) {
    return (
      <Screen style={{ padding: 16 }}>
        <PageHeader icon="package_2" title="Đơn hàng" subtitle="Theo dõi hành trình rau từ luống đến cửa" />
        <EmptyState icon="login" title="Đăng nhập để xem đơn hàng" description="Đơn lẻ, đơn định kỳ và đơn gom của bạn đều ở đây." action={<Button label="Đăng nhập" onPress={() => router.push("/dang-nhap?next=/tabs/don-hang")} />} />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={orders ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <PageHeader icon="package_2" eyebrow="Từ luống đến cửa" title="Đơn hàng" subtitle="Theo dõi trạng thái có cảm xúc, không còn “đang giao” khô khan" />
            {error && <Text style={{ color: colors.error, marginBottom: 8 }}>{error}</Text>}
          </>
        }
        ListEmptyComponent={
          orders === null || sessionLoading ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={150} radius={shape.xl} />
              <Skeleton height={150} radius={shape.xl} />
            </View>
          ) : (
            <EmptyState icon="shopping_basket" title="Bạn chưa có đơn hàng nào" description="Ghé một vườn rau và chọn vài món tươi nhé." action={<Button label="Xem vườn rau" icon="potted_plant" onPress={() => router.push("/tabs/farms")} />} />
          )
        }
        renderItem={({ item, index }) => {
          const s = STATUS_STYLE[item.status];
          const stepIdx = STEPS.indexOf(item.status);
          return (
            <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 12 }}>
              <View style={[styles.card, elevation[1]]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={styles.meta}>{formatDateTime(item.created_at)}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: s.bg }]}>
                    <Icon name={STATUS_ICONS[item.status]} size={14} filled color={s.fg} />
                    <Text style={[styles.statusText, { color: s.fg }]}>{STATUS_LABEL[item.status]}</Text>
                  </View>
                </View>

                <View style={styles.stepsRow}>
                  {STEPS.map((st, i) => (
                    <View key={st} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                      <View style={[styles.stepDot, i <= stepIdx && { backgroundColor: colors.primary }]} />
                      {i < STEPS.length - 1 && <View style={[styles.stepLine, i < stepIdx && { backgroundColor: colors.primary }]} />}
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
                  <Text style={styles.total}>{formatVND(item.total)}</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Chip label={ORDER_TYPE_LABELS[item.type] ?? item.type} small />
                    {item.delivery_mode === "pooled" && <Chip label="Ghép chuyến" tone="tertiary" small />}
                  </View>
                </View>
                {item.note ? <Text style={styles.note}><Icon name="sticky_note_2" size={13} color={colors.onSurfaceVariant} /> {item.note}</Text> : null}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <Button label="Tra cứu gói" icon="search" variant="outlined" small onPress={() => router.push(`/tra-cuu?id=${item.id}`)} />
                  {item.status === "delivered" && <Button label="Xem kế hoạch bữa ăn" icon="restaurant" variant="tertiary" small onPress={() => router.push(`/ke-hoach/${item.id}`)} />}
                </View>
              </View>
            </AnimIn>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 },
  orderId: { ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
  meta: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: shape.full },
  statusText: { fontSize: 12, fontWeight: "700" },
  stepsRow: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.surfaceContainerHighest },
  stepLine: { flex: 1, height: 3, backgroundColor: colors.surfaceContainerHighest, marginHorizontal: 4, borderRadius: 2 },
  total: { ...type.titleLarge, color: colors.primary, fontSize: 18 },
  note: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 8, fontSize: 13 },
});
