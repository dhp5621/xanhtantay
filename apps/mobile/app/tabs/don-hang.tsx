import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { useSession } from "../../hooks/useSession";
import { useLiveRefresh } from "../../hooks/useLive";
import { colors, shape, type, elevation, useStyles, type Colors } from "../../constants/theme";
import { formatDay, formatVND } from "../../constants/format";
import { ORDER_TYPE_ICONS, ORDER_TYPE_LABELS, SIZE_LABELS } from "../../constants/commerce";
import type { MyOrder } from "../../constants/types";
import { AnimIn, PressableScale, Skeleton } from "../../components/motion";
import { Button, Chip, EmptyState, PageHeader, Screen } from "../../components/ui";
import { OrderTimeline, StatusBanner } from "../../components/OrderTimeline";
import { SmartImage } from "../../components/SmartImage";
import { useDialog } from "../../components/Dialog";
import { Icon } from "../../components/Icon";
import { EmojiText } from "../../components/EmojiText";

const canCancel = (o: MyOrder) => o.status === "placed" && !o.allocated;

/** My orders, each with its four-step journey and clock times. */
export default function DonHangScreen() {
  const styles = useStyles(makeStyles);
  const { alert } = useDialog();
  const { user, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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

  const cancel = (o: MyOrder) => {
    alert("Huỷ đơn này?", "Đơn chưa chốt sổ nên huỷ được ngay, nhà vườn chưa cắt rau cho đơn này.", [
      { text: "Giữ đơn", style: "cancel" },
      {
        text: "Huỷ đơn",
        style: "destructive",
        onPress: async () => {
          setBusy(o.id);
          try {
            await apiFetch(`/orders/${o.id}/cancel`, { method: "POST" });
            await load();
          } catch (e) {
            alert("Không huỷ được đơn", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  if (!sessionLoading && !user) {
    return (
      <Screen style={{ padding: 16 }}>
        <PageHeader icon="package_2" title="Đơn hàng" subtitle="Theo dõi hộp rau từ vườn về sảnh chung cư" />
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
            <PageHeader icon="package_2" eyebrow="Từ vườn về sảnh" title="Đơn hàng" subtitle="Mỗi chặng đều có giờ: 18h00 chốt sổ, 4h00 thu hoạch, 6h00 lên xe, 16h00 tới sảnh" />
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
              <Skeleton height={320} radius={shape.xl} />
              <Skeleton height={320} radius={shape.xl} />
            </View>
          ) : (
            <EmptyState icon="inventory_2" title="Chưa có đơn hàng nào" description="Chọn một hộp rau trước 18h00, chiều mai rau có ở sảnh nhà bạn." action={<Button label="Chọn hộp rau" icon="inventory_2" onPress={() => router.push("/tabs/hop-rau")} />} />
          )
        }
        renderItem={({ item, index }) => {
          const farmer = item.farmers?.find((f) => f.farmer)?.farmer ?? null;
          const cancelled = item.status === "cancelled";
          return (
            <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 12 }}>
              <View style={[styles.card, elevation[1], cancelled && { opacity: 0.8 }]}>
                <PressableScale scaleTo={0.985} onPress={() => router.push(`/don-hang/${item.id}`)}>
                  <View style={styles.cardHeader}>
                    <SmartImage uri={item.box?.image_url} style={styles.photo} loaderSize={20} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.boxName} numberOfLines={1}>
                        {item.quantity} × {item.box?.name ?? "Hộp rau"}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                        <Chip icon={ORDER_TYPE_ICONS[item.type]} label={ORDER_TYPE_LABELS[item.type] ?? item.type} tone={item.type === "single" ? "surface" : item.type === "subscription" ? "tertiary" : "secondary"} small />
                        {item.box ? <Chip label={SIZE_LABELS[item.box.size] ?? item.box.size} small /> : null}
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.total}>{formatVND(item.total)}</Text>
                      <Text style={styles.meta}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.deliveryRow}>
                    <Icon name="event" size={16} color={colors.onSurfaceVariant} />
                    <Text style={styles.deliveryText} numberOfLines={1}>
                      Giao {formatDay(item.delivery_date)}
                      {item.cluster ? ` · sảnh ${item.cluster.name}` : ""}
                    </Text>
                  </View>

                  <StatusBanner status={item.status} farmer={farmer} />
                  {!cancelled && (
                    <View style={{ marginTop: 14 }}>
                      <OrderTimeline status={item.status} farmer={farmer} stamps={{ harvesting: item.harvested_at, loaded: item.loaded_at, delivered: item.delivered_at }} />
                    </View>
                  )}
                </PressableScale>

                {item.note ? (
                  <View style={styles.noteRow}>
                    <Icon name="sticky_note_2" size={14} color={colors.onSurfaceVariant} />
                    <EmojiText style={styles.note}>{item.note}</EmojiText>
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <Button label="Chi tiết & thực đơn" icon="menu_book" variant="tonal" small onPress={() => router.push(`/don-hang/${item.id}`)} />
                  {canCancel(item) && <Button label="Huỷ đơn" icon="cancel" variant="error" small loading={busy === item.id} onPress={() => cancel(item)} />}
                </View>
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
    cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    photo: { width: 56, height: 56, borderRadius: shape.md },
    boxName: { ...type.titleMedium, color: colors.onSurface, fontSize: 16 },
    meta: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
    total: { ...type.headlineSmall, color: colors.primary, fontSize: 18, lineHeight: 24 },
    deliveryRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 10 },
    deliveryText: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 13, flex: 1 },
    noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 12 },
    note: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13, flex: 1 },
    actions: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" },
  });
