import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Order } from "@xanhtantay/types";
import { apiFetch } from "../../../constants/api";
import { useSession } from "../../../hooks/useSession";
import { colors, shape, type, elevation } from "../../../constants/theme";
import { formatDate, formatVND, STATUS_SHORT, STATUS_ICONS } from "../../../constants/format";
import { AnimIn, AnimInScale, PressableScale, Skeleton } from "../../../components/motion";
import { Chip, ListItem, StatTile } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { useLiveRefresh } from "../../../hooks/useLive";

interface Me {
  name: string;
  stats: { pendingOrders: number; products: number; subscribers: number };
  farm: { id: string; name: string; slug: string; location: string } | null;
}
type FarmerOrder = Order & { customer_name?: string | null };

/** Mirrors apps/web/src/app/(farmer)/farmer/page.tsx. */
export default function FarmerHomeScreen() {
  const { user } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<FarmerOrder[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [m, o] = await Promise.all([apiFetch("/users/me").catch(() => null), apiFetch("/orders").catch(() => [])]);
    setMe(m);
    setOrders(o);
  }, []);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Chào buổi sáng" : hour < 17 ? "Chào buổi chiều" : "Chào buổi tối";
  const revenue = (orders ?? []).filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0);
  const pending = me?.stats.pendingOrders ?? (orders ?? []).filter((o) => o.status === "harvesting").length;
  const recent = (orders ?? []).slice(0, 4);

  const tiles = [
    { icon: "pending_actions", label: "Đơn chờ thu hoạch", value: pending, href: "/tabs/farmer/don-hang", tone: "tertiary" as const },
    { icon: "package_2", label: "Tổng đơn hàng", value: orders?.length ?? 0, href: "/tabs/farmer/don-hang", tone: "secondary" as const },
    { icon: "nutrition", label: "Sản phẩm", value: me?.stats.products ?? 0, href: "/tabs/farmer/san-pham", tone: "primary" as const },
    { icon: "event_repeat", label: "Khách đăng ký", value: me?.stats.subscribers ?? 0, href: "/tabs/farmer/dang-ky", tone: "surface" as const },
  ];
  const quickLinks = [
    { href: "/tabs/farmer/nhat-ky", icon: "photo_camera", label: "Đăng nhật ký hôm nay", desc: "Khách tin hơn khi thấy vườn mỗi ngày" },
    { href: "/tabs/farmer/san-pham", icon: "inventory_2", label: "Cập nhật tồn kho", desc: "Bật/tắt món còn hàng" },
    { href: "/tabs/farmer/don-hang", icon: "local_shipping", label: "Xử lý đơn mới", desc: `${pending} đơn đang chờ` },
    ...(me?.farm ? [{ href: `/farms/${me.farm.id}`, icon: "storefront", label: "Xem trang vườn của tôi", desc: "Như khách hàng nhìn thấy" }] : []),
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 20 }}
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
      <AnimIn>
        <Text style={styles.eyebrow}>{me?.farm ? `${me.farm.name} · ${me.farm.location}` : me ? "Chưa có vườn" : " "}</Text>
        <Text style={styles.title}>
          {greeting}, {(me?.name ?? user?.name)?.split(" ").pop()}!
        </Text>
      </AnimIn>

      {me && !me.farm && (
        <AnimIn>
          <View style={styles.warn}>
            <Text style={{ color: colors.onErrorContainer }}>Tài khoản này chưa gắn với vườn nào. Liên hệ quản trị để tạo vườn.</Text>
          </View>
        </AnimIn>
      )}

      {orders === null ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Skeleton height={100} radius={shape.xl} width="48%" />
          <Skeleton height={100} radius={shape.xl} width="48%" />
          <Skeleton height={100} radius={shape.xl} width="48%" />
          <Skeleton height={100} radius={shape.xl} width="48%" />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {tiles.slice(0, 2).map((t, i) => (
              <AnimInScale key={t.label} index={i} style={{ flex: 1 }}>
                <StatTile icon={t.icon} value={t.value} label={t.label} tone={t.tone} onPress={() => router.push(t.href as never)} />
              </AnimInScale>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {tiles.slice(2).map((t, i) => (
              <AnimInScale key={t.label} index={i + 2} style={{ flex: 1 }}>
                <StatTile icon={t.icon} value={t.value} label={t.label} tone={t.tone} onPress={() => router.push(t.href as never)} />
              </AnimInScale>
            ))}
          </View>
          <AnimInScale index={4}>
            <View style={styles.revenue}>
              <View>
                <Text style={styles.revenueLabel}>DOANH THU ĐÃ GIAO</Text>
                <Text style={styles.revenueValue}>{formatVND(revenue)}</Text>
              </View>
              <Icon name="payments" size={34} />
            </View>
          </AnimInScale>
        </View>
      )}

      <View>
        <Text style={styles.sectionTitle}>Việc hôm nay</Text>
        {quickLinks.map((l, i) => (
          <AnimIn key={l.href} index={i} delay={150}>
            <ListItem icon={l.icon} title={l.label} desc={l.desc} onPress={() => router.push(l.href as never)} />
          </AnimIn>
        ))}
      </View>

      {recent.length > 0 && (
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={styles.sectionTitle}>Đơn gần đây</Text>
            <PressableScale onPress={() => router.push("/tabs/farmer/don-hang")}>
              <Text style={styles.link}>Tất cả →</Text>
            </PressableScale>
          </View>
          <View style={{ gap: 8 }}>
            {recent.map((o, i) => (
              <AnimIn key={o.id} index={i} delay={250}>
                <PressableScale style={[styles.orderRow, elevation[1]]} onPress={() => router.push("/tabs/farmer/don-hang")}>
                  <Icon name={STATUS_ICONS[o.status]} size={22} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.orderName}>{o.customer_name ?? "Khách hàng"}</Text>
                    <Text style={styles.meta}>#{o.id.slice(0, 8).toUpperCase()} · {formatDate(o.created_at, { day: "numeric", month: "short" })}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={styles.orderTotal}>{formatVND(o.total)}</Text>
                    <Chip label={STATUS_SHORT[o.status]} small tone={o.status === "delivered" ? "primary" : o.status === "loaded" ? "tertiary" : "surface"} />
                  </View>
                </PressableScale>
              </AnimIn>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  eyebrow: { ...type.labelLarge, color: colors.primary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  title: { ...type.headlineSmall, color: colors.onSurface, fontSize: 26 },
  warn: { backgroundColor: colors.errorContainer, borderRadius: shape.xl, padding: 16 },
  revenue: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 18 },
  revenueLabel: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 11, letterSpacing: 0.6 },
  revenueValue: { ...type.headlineSmall, color: colors.primary, fontSize: 26, marginTop: 2 },
  sectionTitle: { ...type.titleLarge, color: colors.onSurface, fontSize: 18, marginBottom: 10 },
  link: { ...type.labelLarge, color: colors.primary, fontSize: 13 },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 12 },
  orderName: { ...type.titleMedium, color: colors.onSurface, fontSize: 14 },
  meta: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  orderTotal: { ...type.labelLarge, color: colors.onSurface, fontSize: 14 },
});
