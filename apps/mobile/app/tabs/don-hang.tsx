import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Order, OrderStatus } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../constants/api";
import { useSession } from "../../hooks/useSession";
import { useLiveRefresh } from "../../hooks/useLive";
import { colors, shape, type, elevation, emojiFont, useStyles, type Colors } from "../../constants/theme";
import { formatDateTime, formatVND, STATUS_ICONS } from "../../constants/format";
import { ORDER_TYPE_LABELS } from "../../constants/commerce";
import { AnimIn, Skeleton } from "../../components/motion";
import { Button, Chip, EmptyState, PageHeader, Screen } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { EmojiText } from "../../components/EmojiText";

const STEPS: OrderStatus[] = ["harvesting", "loaded", "delivered"];
const STEP_SHORT: Record<OrderStatus, string> = { harvesting: "Thu hoạch", loaded: "Lên xe", delivered: "Đã giao" };

type MyOrder = Order & {
  delivery_mode?: string;
  farm?: { id: string; name: string; location: string; slug: string } | null;
  farmer_name?: string | null;
  items?: { id: string; quantity: number; product_name?: string | null; product_unit?: string | null }[];
};

/** Emotional status labels from the web (getOrderStatusLabel). */
function statusLabel(status: OrderStatus, farmerName?: string | null) {
  if (status === "harvesting") return `Rau đang được ${farmerName ?? "nhà vườn"} thu hoạch`;
  if (status === "loaded") return "Hàng đã lên xe lạnh về phố";
  return "Đồ quê đã đến tận cửa nhà bạn";
}

/** Mirrors apps/web/src/app/(customer)/don-hang/page.tsx. */
export default function DonHangScreen() {
  const styles = useStyles(makeStyles);
  const { user, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusStyle: Record<OrderStatus, { bg: string; fg: string }> = {
    harvesting: { bg: colors.statusHarvestingBg, fg: colors.statusHarvestingFg },
    loaded: { bg: colors.statusLoadedBg, fg: colors.statusLoadedFg },
    delivered: { bg: colors.statusDeliveredBg, fg: colors.statusDeliveredFg },
  };

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
  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      if (!sessionLoading) load();
    }, [sessionLoading, load])
  );

  if (!sessionLoading && !user) {
    return (
      <Screen style={{ padding: 16 }}>
        <PageHeader icon="package_2" title="Đơn hàng" subtitle="Theo dõi hành trình rau từ luống đến cửa" />
        <EmptyState icon="login" title="Đăng nhập để xem đơn hàng" description="Đơn lẻ, đơn định kỳ và đơn gom của bạn đều ở đây." action={<Button label="Đăng nhập" icon="login" onPress={() => router.push("/dang-nhap?next=/tabs/don-hang")} />} />
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
            {error && (
              <View style={styles.errorBox}>
                <Icon name="error" size={18} color={colors.onErrorContainer} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          orders === null || sessionLoading ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={200} radius={shape.xl} />
              <Skeleton height={200} radius={shape.xl} />
            </View>
          ) : (
            <EmptyState icon="shopping_basket" title="Chưa có đơn hàng nào" description="Khám phá các vườn rau và đặt đơn đầu tiên nhé!" action={<Button label="Chọn vườn rau" icon="potted_plant" onPress={() => router.push("/tabs/farms")} />} />
          )
        }
        renderItem={({ item, index }) => {
          const s = statusStyle[item.status];
          const stepIdx = STEPS.indexOf(item.status);
          return (
            <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 12 }}>
              <View style={[styles.card, elevation[1]]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.farmName}>{item.farm?.name ?? "Vườn rau"}</Text>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      <Chip label={ORDER_TYPE_LABELS[item.type] ?? item.type} small />
                      {item.delivery_mode === "pooled" && <Chip icon="group_work" label="Ghép chuyến" tone="tertiary" small />}
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.total}>{formatVND(item.total)}</Text>
                    <Text style={styles.meta}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                  </View>
                </View>

                <View style={[styles.statusChip, { backgroundColor: s.bg }]}>
                  <Icon name={STATUS_ICONS[item.status]} size={18} filled color={s.fg} />
                  <Text style={[styles.statusText, { color: s.fg }]}>{statusLabel(item.status, item.farmer_name)}</Text>
                </View>

                {!!item.items?.length && (
                  <View style={styles.itemsRow}>
                    {item.items.map((l) => <Chip key={l.id} icon="eco" label={`${l.quantity} ${l.product_unit ?? ""} ${l.product_name ?? ""}`} small />)}
                  </View>
                )}
                {item.note ? (
                  <EmojiText style={styles.note}>
                    <Icon name="sticky_note_2" size={13} color={colors.onSurfaceVariant} /> {item.note}
                  </EmojiText>
                ) : null}

                <View style={styles.stepsRow}>
                  {STEPS.map((st, i) => {
                    const done = i < stepIdx;
                    const current = i === stepIdx;
                    return (
                      <View key={st} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                        <View style={{ alignItems: "center" }}>
                          <View style={[styles.stepDot, (done || current) && { backgroundColor: colors.primary }]}>
                            <Icon name={done ? "check" : STATUS_ICONS[st]} size={16} filled={current} color={done || current ? colors.onPrimary : colors.onSurfaceVariant} />
                          </View>
                          <Text style={[styles.stepLabel, current && { color: colors.primary, fontWeight: "700" }]}>{STEP_SHORT[st]}</Text>
                        </View>
                        {i < STEPS.length - 1 && <View style={[styles.stepLine, done && { backgroundColor: colors.primary }]} />}
                      </View>
                    );
                  })}
                </View>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  {item.status === "delivered" && (
                    <>
                      <Button label="Kế hoạch ăn" icon="calendar_month" variant="tonal" small onPress={() => router.push(`/ke-hoach/${item.id}`)} />
                      <Button label="Nấu gì?" icon="skillet" variant="tertiary" small onPress={() => router.push(`/tabs/cong-thuc?order=${item.id}`)} />
                    </>
                  )}
                  <Button label="Mã QR gói rau" icon="qr_code_2" variant="outlined" small onPress={() => router.push(`/tra-cuu?id=${item.id}`)} />
                </View>
                <Text style={[styles.meta, { marginTop: 10 }]}>{formatDateTime(item.created_at)}</Text>
              </View>
            </AnimIn>
          );
        }}
      />
    </Screen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.errorContainer, borderRadius: shape.md, padding: 10, marginBottom: 12 },
    errorText: { ...type.bodyMedium, color: colors.onErrorContainer, flex: 1, fontSize: 13 },
    card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 16 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 },
    farmName: { ...type.titleLarge, color: colors.onSurface, fontSize: 18 },
    meta: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
    total: { ...type.headlineSmall, color: colors.primary, fontSize: 20 },
    statusChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: shape.full },
    statusText: { ...type.labelLarge, fontSize: 13, flex: 1 },
    itemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
    note: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 10, fontSize: 13 },
    stepsRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 16 },
    stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceContainerHighest, alignItems: "center", justifyContent: "center" },
    stepLabel: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 4 },
    stepLine: { flex: 1, height: 3, backgroundColor: colors.surfaceContainerHighest, marginHorizontal: 6, marginTop: 13, borderRadius: 2 },
  });
