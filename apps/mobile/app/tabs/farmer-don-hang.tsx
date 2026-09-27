import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import type { Order, OrderStatus } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, elevation, emojiFont, useStyles } from "../../constants/theme";
import { formatDateTime, formatVND, STATUS_ICONS } from "../../constants/format";
import { ORDER_TYPE_LABELS } from "../../constants/commerce";
import { AnimIn, Skeleton } from "../../components/motion";
import { Button, Chip, EmptyState, PageHeader } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { useLiveRefresh } from "../../hooks/useLive";
import type { Colors } from "../../constants/theme";
import { useDialog } from "../../components/Dialog";

type FarmerOrder = Order & {
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_mode?: string;
  items?: { id: string; product_name?: string | null; product_unit?: string | null; quantity: string | number }[];
};

const STATUS_LABEL: Record<OrderStatus, string> = { harvesting: "Đang thu hoạch", loaded: "Đã lên xe", delivered: "Đã giao" };
const STATUS_STYLE: Record<OrderStatus, { bg: string; fg: string }> = {
  harvesting: { bg: colors.statusHarvestingBg, fg: colors.statusHarvestingFg },
  loaded: { bg: colors.statusLoadedBg, fg: colors.statusLoadedFg },
  delivered: { bg: colors.statusDeliveredBg, fg: colors.statusDeliveredFg },
};
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string; icon: string }>> = {
  harvesting: { status: "loaded", label: "Đã lên xe", icon: "local_shipping" },
  loaded: { status: "delivered", label: "Đã giao", icon: "home" },
};

/** Mirrors apps/web/src/app/(farmer)/farmer/don-hang/page.tsx + OrderStatusButton. */
export default function FarmerDonHangScreen() {
  const { alert } = useDialog();
  const styles = useStyles(makeStyles);
  const [orders, setOrders] = useState<FarmerOrder[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = useCallback(async () => {
    try {
      setOrders(await apiFetch("/orders"));
    } catch {
      setOrders((o) => o ?? []);
    }
  }, []);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const advance = async (order: FarmerOrder) => {
    const next = NEXT[order.status];
    if (!next) return;
    setUpdating(order.id);
    try {
      await apiFetch(`/orders/${order.id}/status`, { method: "PATCH", body: JSON.stringify({ status: next.status }) });
      setOrders((os) => (os ?? []).map((o) => (o.id === order.id ? { ...o, status: next.status } : o)));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      alert("Không cập nhật được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setUpdating(null);
    }
  };

  const all = orders ?? [];
  const pending = all.filter((o) => o.status !== "delivered").length;
  const shown = filter === "open" ? all.filter((o) => o.status !== "delivered") : all;

  return (
    <FlatList
      style={styles.container}
      data={shown}
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
          tintColor={colors.primary}
        />
      }
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      ListHeaderComponent={
        <>
          <PageHeader icon="package_2" eyebrow={pending > 0 ? `${pending} đơn cần xử lý` : "Mọi đơn đã giao"} title="Đơn hàng" subtitle="Hái theo đơn đã chốt, bấm một nút khi xe rời vườn" />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            <Chip label={`Đang xử lý · ${pending}`} selected={filter === "open"} onPress={() => setFilter("open")} />
            <Chip label={`Tất cả · ${all.length}`} selected={filter === "all"} onPress={() => setFilter("all")} />
          </View>
        </>
      }
      ListEmptyComponent={
        orders === null ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={170} radius={shape.xl} />
            <Skeleton height={170} radius={shape.xl} />
          </View>
        ) : (
          <EmptyState icon="agriculture" title={filter === "open" ? "Không còn đơn nào chờ" : "Chưa có đơn hàng nào"} description={filter === "open" ? "Mọi đơn đã giao xong. Nghỉ tay uống nước nhé!" : "Khi khách đặt rau từ vườn bạn, đơn sẽ hiện ở đây."} />
        )
      }
      renderItem={({ item, index }) => {
        const s = STATUS_STYLE[item.status];
        const next = NEXT[item.status];
        return (
          <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 12 }}>
            <View style={[styles.card, elevation[1], item.status === "delivered" && { opacity: 0.75 }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.customerName}>{item.customer_name ?? "Khách hàng"}</Text>
                  <Text style={styles.customerMeta}>{item.customer_phone ?? "—"} · {ORDER_TYPE_LABELS[item.type] ?? item.type}{item.delivery_mode === "pooled" ? " · ghép chuyến" : ""}</Text>
                  <Text style={styles.customerMeta}>#{item.id.slice(0, 8).toUpperCase()} · {formatDateTime(item.created_at)}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={styles.total}>{formatVND(item.total)}</Text>
                  <View style={[styles.statusChip, { backgroundColor: s.bg }]}>
                    <Icon name={STATUS_ICONS[item.status]} size={13} filled color={s.fg} />
                    <Text style={[styles.statusText, { color: s.fg }]}>{STATUS_LABEL[item.status]}</Text>
                  </View>
                </View>
              </View>
              {!!item.items?.length && (
                <View style={styles.itemsRow}>
                  {item.items.map((l) => <Chip key={l.id} label={`${Number(l.quantity)} ${l.product_unit ?? ""} ${l.product_name ?? ""}`} small />)}
                </View>
              )}
              {item.note ? <Text style={styles.note}><Icon name="sticky_note_2" size={13} color={colors.onSurfaceVariant} /> {item.note}</Text> : null}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {next && <Button label={next.label} icon={next.icon} small loading={updating === item.id} onPress={() => advance(item)} />}
                <Button label="Tem QR" icon="qr_code_2" variant="outlined" small onPress={() => router.push(`/tem/${item.id}`)} />
              </View>
            </View>
          </AnimIn>
        );
      }}
    />
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  customerName: { ...emojiFont,  ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
  customerMeta: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  total: { ...type.titleMedium, color: colors.primary, fontSize: 16 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 9, borderRadius: shape.full },
  statusText: { fontSize: 11, fontWeight: "700" },
  itemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  note: { ...emojiFont,  ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 8, fontSize: 12 },
});
