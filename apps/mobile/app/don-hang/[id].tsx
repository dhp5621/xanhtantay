import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, useStyles, type Colors } from "../../constants/theme";
import { formatVND } from "../../constants/format";
import type { OrderTrace } from "../../constants/types";
import { useLiveRefresh } from "../../hooks/useLive";
import { AnimIn } from "../../components/motion";
import { Button, EmptyState, SectionHead } from "../../components/ui";
import { TraceView } from "../../components/TraceView";
import { CareMessage } from "../../components/CareMessage";
import { QrImage } from "../../components/QrImage";
import { PageLoader } from "../../components/Loader";
import { useDialog } from "../../components/Dialog";
import { Icon } from "../../components/Icon";
import { EmojiText } from "../../components/EmojiText";

/** One order: journey with real timestamps, care message, contents, menu, QR and the price breakdown. */
export default function OrderDetailScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { alert } = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<OrderTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setOrder(await apiFetch(`/orders/${id}`));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải được đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cancel = () => {
    alert("Huỷ đơn này?", "Đơn chưa chốt sổ nên huỷ được ngay, nhà vườn chưa cắt rau cho đơn này.", [
      { text: "Giữ đơn", style: "cancel" },
      {
        text: "Huỷ đơn",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await apiFetch(`/orders/${id}/cancel`, { method: "POST" });
            await load();
          } catch (e) {
            alert("Không huỷ được đơn", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (loading) return <PageLoader />;
  if (!order) {
    return (
      <View style={styles.center}>
        <EmptyState icon="search_off" title="Không tìm thấy đơn hàng" description={error ?? undefined} action={<Button label="Về danh sách đơn" icon="arrow_back" onPress={() => router.replace("/tabs/don-hang")} />} />
      </View>
    );
  }

  const mine = order.mine;
  const cancellable = mine && order.status === "placed" && !order.allocated;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }}
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
    >
      <TraceView
        trace={order}
        lead={
          mine && order.care_message ? (
            <AnimIn delay={40}>
              <CareMessage message={order.care_message} />
            </AnimIn>
          ) : null
        }
      >
        {mine ? (
          <AnimIn>
            <SectionHead icon="receipt_long" title="Thanh toán" />
            <View style={styles.card}>
              <Row label={`${order.quantity} hộp`} value={formatVND(order.subtotal ?? 0)} />
              <Row label="Phí giao" value={order.ship_fee ? formatVND(order.ship_fee) : "Miễn phí"} accent={!order.ship_fee} />
              <View style={styles.divider} />
              <Row label="Tổng cộng" value={formatVND(order.total ?? 0)} strong />
              {order.address ? (
                <View style={styles.extra}>
                  <Icon name="location_on" size={16} color={colors.onSurfaceVariant} />
                  <EmojiText style={styles.extraText}>{order.address}</EmojiText>
                </View>
              ) : null}
              {order.note ? (
                <View style={styles.extra}>
                  <Icon name="sticky_note_2" size={16} color={colors.onSurfaceVariant} />
                  <EmojiText style={styles.extraText}>{order.note}</EmojiText>
                </View>
              ) : null}
              {order.group_order_id ? <Button label="Xem nhóm gom đơn" icon="groups" variant="tonal" small onPress={() => router.push(`/tabs/gom-don/${order.group_order_id}`)} style={{ marginTop: 12 }} /> : null}
            </View>
          </AnimIn>
        ) : null}

        <AnimIn>
          <SectionHead icon="qr_code_2" title="Mã QR truy xuất" />
          <View style={[styles.card, { alignItems: "center" }]}>
            <QrImage orderId={order.id} size={170} />
            <Text style={[styles.muted, { textAlign: "center", marginTop: 10 }]}>Ai quét mã này cũng xem được vườn trồng, giờ thu hoạch và hành trình của hộp rau. Mã không hiện thông tin người mua.</Text>
          </View>
        </AnimIn>

        {cancellable ? (
          <AnimIn style={{ alignItems: "center" }}>
            <Button label="Huỷ đơn" icon="cancel" variant="error" onPress={cancel} loading={busy} />
            <Text style={[styles.muted, { textAlign: "center", marginTop: 8 }]}>Huỷ được cho tới khi chốt sổ lúc 18h00.</Text>
          </AnimIn>
        ) : null}
      </TraceView>
    </ScrollView>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowStrong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowStrongValue, accent && { color: colors.primary }]}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    center: { flex: 1, backgroundColor: c.surface, justifyContent: "center", padding: 16 },
    muted: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13 },
    card: { backgroundColor: c.surfaceContainerLow, borderRadius: shape.xl, padding: 16, gap: 8 },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
    rowLabel: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 14 },
    rowValue: { ...type.labelLarge, color: c.onSurface, fontSize: 14 },
    rowStrong: { ...type.titleMedium, color: c.onSurface, fontSize: 16 },
    rowStrongValue: { ...type.headlineSmall, color: c.primary, fontSize: 20, lineHeight: 26 },
    divider: { height: 1, backgroundColor: c.outlineVariant },
    extra: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 4 },
    extraText: { ...type.bodyMedium, color: c.onSurface, fontSize: 14, flex: 1 },
  });
