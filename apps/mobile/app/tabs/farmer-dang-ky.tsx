import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import type { Subscription } from "@xanhtantay/types";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation, emojiFont, useStyles } from "../../constants/theme";
import { formatDate } from "../../constants/format";
import { AnimIn, Skeleton } from "../../components/motion";
import { Avatar, Chip, EmptyState, PageHeader } from "../../components/ui";
import { useLiveRefresh } from "../../hooks/useLive";
import type { Colors } from "../../constants/theme";

type FarmSub = Subscription & { customer_name: string | null; customer_phone: string | null };
const FREQ_LABEL: Record<string, string> = { weekly: "Mỗi tuần", monthly: "Mỗi tháng" };

/** Mirrors apps/web/src/app/(farmer)/farmer/dang-ky/page.tsx. */
export default function FarmerDangKyScreen() {
  const styles = useStyles(makeStyles);
  const [subs, setSubs] = useState<FarmSub[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const active = (subs ?? []).filter((s) => s.active).length;

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
      ListHeaderComponent={<PageHeader icon="event_repeat" eyebrow={`${active} gói đang chạy`} title="Khách đăng ký" subtitle="Khách hàng nhận rau định kỳ từ vườn bạn" />}
      ListEmptyComponent={
        subs === null ? (
          <View style={{ gap: 10 }}>
            <Skeleton height={84} radius={shape.lg} />
            <Skeleton height={84} radius={shape.lg} />
          </View>
        ) : (
          <EmptyState icon="event_repeat" title="Chưa có khách đăng ký nào" description="Khi khách tạo gói tuần / tháng từ vườn bạn, họ sẽ hiện ở đây." />
        )
      }
      renderItem={({ item: s, index }) => (
        <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 10 }}>
          <View style={[styles.row, elevation[1], !s.active && { opacity: 0.7 }]}>
            <Avatar name={s.customer_name} size={44} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name}>{s.customer_name ?? "Khách hàng"}</Text>
              <Text style={styles.meta}>{s.customer_phone ?? "—"} · {s.items.length} món</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <Chip icon={s.frequency === "weekly" ? "date_range" : "calendar_month"} label={FREQ_LABEL[s.frequency] ?? s.frequency} tone="primary" small />
                <Chip label={s.active ? "Đang hoạt động" : "Đã dừng"} tone={s.active ? "secondary" : "error"} small />
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.meta}>Giao tiếp theo</Text>
              <Text style={styles.next}>{formatDate(s.next_delivery, { day: "numeric", month: "short" })}</Text>
            </View>
          </View>
        </AnimIn>
      )}
    />
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 14 },
  name: {  ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
  meta: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  next: { ...type.titleMedium, color: colors.primary, fontSize: 14 },
});
