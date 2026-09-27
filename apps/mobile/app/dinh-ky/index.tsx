import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Subscription } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, elevation, emojiFont, useStyles } from "../../constants/theme";
import { formatDate, formatVND } from "../../constants/format";
import { AnimIn, Skeleton } from "../../components/motion";
import { Button, Chip, EmptyState, PageHeader } from "../../components/ui";
import { useLiveRefresh } from "../../hooks/useLive";
import type { Colors } from "../../constants/theme";
import { useDialog } from "../../components/Dialog";

type Sub = Omit<Subscription, "items"> & {
  farm: { id: string; name: string; slug: string } | null;
  items: { product_id: string; quantity: number; name: string | null; unit: string | null; price_per_unit: number | null }[];
};

const FREQ_LABEL: Record<string, string> = { weekly: "Mỗi tuần", monthly: "Mỗi tháng" };

/** Mirrors apps/web/src/app/(customer)/dang-ky/page.tsx + SubscriptionActions. */
export default function DinhKyScreen() {
  const { alert } = useDialog();
  const styles = useStyles(makeStyles);
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSubs(await apiFetch("/subscriptions"));
    } catch {
      setSubs((s) => s ?? []);
    }
  }, []);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleActive = async (s: Sub) => {
    setBusy(s.id);
    try {
      await apiFetch("/subscriptions", { method: "PATCH", body: JSON.stringify({ id: s.id, active: !s.active }) });
      setSubs((xs) => (xs ?? []).map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
      alert(s.active ? "Đã tạm dừng gói" : "Gói đã hoạt động trở lại", s.active ? "Bật lại bất cứ lúc nào." : undefined);
    } catch (e) {
      alert("Không cập nhật được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(null);
    }
  };

  return (
    <FlatList
      style={styles.container}
      data={subs ?? []}
      keyExtractor={(s) => s.id}
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
      ListHeaderComponent={<PageHeader icon="event_repeat" eyebrow="Tự động, đúng hẹn" title="Gói đăng ký" subtitle="Rau củ giao định kỳ, không cần đặt lại" />}
      ListEmptyComponent={
        subs === null ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={160} radius={shape.xl} />
            <Skeleton height={160} radius={shape.xl} />
          </View>
        ) : (
          <EmptyState icon="event_repeat" title="Chưa có gói đăng ký nào" description="Thêm món vào giỏ ở trang vườn, rồi bấm “Giao định kỳ” để tạo gói tuần / tháng." action={<Button label="Chọn vườn rau" icon="potted_plant" onPress={() => router.push("/tabs/farms")} />} />
        )
      }
      renderItem={({ item: s, index }) => {
        const est = s.items.reduce((sum, i) => sum + (i.price_per_unit ?? 0) * i.quantity, 0);
        return (
          <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 14 }}>
            <View style={[styles.card, elevation[1], !s.active && { opacity: 0.75 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.farmName}>{s.farm?.name ?? "Vườn rau"}</Text>
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    <Chip icon={s.frequency === "weekly" ? "date_range" : "calendar_month"} label={FREQ_LABEL[s.frequency] ?? s.frequency} tone="primary" small />
                    <Chip icon={s.active ? "check_circle" : "pause_circle"} label={s.active ? "Đang hoạt động" : "Đã tạm dừng"} tone={s.active ? "secondary" : "error"} small />
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.body}>Giao tiếp theo</Text>
                  <Text style={styles.next}>{formatDate(s.next_delivery, { weekday: "long", day: "numeric", month: "long" })}</Text>
                </View>
              </View>

              {s.items.length > 0 && (
                <View style={styles.itemsBox}>
                  <Text style={styles.label}>GIỎ HÀNG ĐỊNH KỲ · ~{formatVND(est)}</Text>
                  {s.items.map((it, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
                      <Text style={styles.itemText}>
                        {it.quantity} {it.unit ?? "×"} {it.name ?? "Sản phẩm không còn"}
                      </Text>
                      {it.price_per_unit !== null && <Text style={styles.body}>{formatVND(it.price_per_unit * it.quantity)}</Text>}
                    </View>
                  ))}
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {s.farm && <Button label="Đổi món" icon="edit" variant="outlined" small onPress={() => router.push(`/farms/${s.farm!.id}`)} />}
                <Button label={s.active ? "Tạm dừng" : "Kích hoạt lại"} icon={s.active ? "pause_circle" : "play_circle"} variant={s.active ? "error" : "tonal"} small loading={busy === s.id} onPress={() => toggleActive(s)} />
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
  body: {  ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 20 },
  farmName: {  ...type.titleLarge, color: colors.onSurface, fontSize: 18 },
  next: { ...type.titleMedium, color: colors.primary, fontSize: 14, textAlign: "right" },
  itemsBox: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.md, padding: 12, marginTop: 14 },
  label: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 11, letterSpacing: 0.6 },
  itemText: {  ...type.bodyMedium, color: colors.onSurface, fontSize: 14, flex: 1 },
});
