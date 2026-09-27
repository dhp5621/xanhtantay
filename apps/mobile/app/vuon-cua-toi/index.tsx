import { useCallback, useEffect, useState } from "react";
import { useLiveRefresh } from "../../hooks/useLive";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, elevation } from "../../constants/theme";
import { formatDate, formatVND } from "../../constants/format";
import { levelFor, LEVELS } from "../../constants/commerce";
import { AnimIn, AnimInScale, AnimatedProgress, HeroBlob, Skeleton } from "../../components/motion";
import { Button, EmptyState, PageHeader, StatTile } from "../../components/ui";
import { Icon } from "../../components/Icon";

interface Loyalty {
  points: number;
  pendingPoints: number;
  level: string;
  trees: number;
  deliveredOrders: number;
  deliveredTotal: number;
  toFarmers: number;
  recent: { id: string; total: number; created_at: string; farm_name: string | null; farm_location: string | null }[];
}

/** Mirrors apps/web/src/app/(customer)/vuon-cua-toi/page.tsx (GrowingTree + LevelPager as emoji stages). */
export default function VuonCuaToiScreen() {
  const { width } = useWindowDimensions();
  const [data, setData] = useState<Loyalty | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      apiFetch("/users/points")
        .then(setData)
        .catch((e) => setError(e instanceof ApiError && e.status === 401 ? "Đăng nhập để xem vườn của bạn." : e instanceof Error ? e.message : "Không tải được dữ liệu")),
    []
  );
  useLiveRefresh(load);
  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <View style={styles.center}>
        <EmptyState icon="park" title="Vườn của tôi" description={error} action={<Button label="Đăng nhập" onPress={() => router.push("/dang-nhap?next=/vuon-cua-toi&role=customer")} />} />
      </View>
    );
  }
  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, padding: 16, gap: 12 }}>
        <Skeleton height={260} radius={shape.xlIncreased} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Skeleton height={110} radius={shape.xl} width="48%" />
          <Skeleton height={110} radius={shape.xl} width="48%" />
        </View>
      </View>
    );
  }

  const lv = levelFor(data.points);
  const cardW = Math.min(180, width * 0.44);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 22 }}>
      <PageHeader icon="park" eyebrow="Tích điểm · Trồng cây" title="Vườn của tôi" subtitle="Mỗi đơn giao xong là thêm điểm, cây lớn thêm một chút" />

      <AnimInScale>
        <View style={[styles.hero, elevation[2]]}>
          <HeroBlob size={260} right={-80} top={-100} />
          <Icon name={lv.level.icon} size={88} />
          <Text style={styles.heroEyebrow}>HẠNG HIỆN TẠI</Text>
          <Text style={styles.heroTitle}>{lv.level.name}</Text>
          <Text style={styles.heroDesc}>{lv.level.desc}</Text>
          <Text style={styles.heroPoints}>{data.points} điểm</Text>
          {lv.next ? (
            <>
              <AnimatedProgress value={lv.progress * 100} style={{ width: "100%", marginTop: 10 }} track="rgba(0,0,0,.1)" />
              <Text style={styles.heroNext}>
                Còn {lv.next.min - data.points} điểm nữa lên <Text style={{ fontWeight: "800" }}>{lv.next.name}</Text>
                {data.pendingPoints > 0 ? ` · ${data.pendingPoints} điểm đang chờ đơn giao xong` : ""}
              </Text>
            </>
          ) : (
            <Text style={styles.heroNext}>Bạn đã ở hạng cao nhất. Cảm ơn vì đã nuôi cả khu vườn!</Text>
          )}
        </View>
      </AnimInScale>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <AnimIn index={0} style={{ flex: 1 }}>
            <StatTile icon="forest" value={data.trees} label="cây đã trồng" desc="1 cây / 200 điểm" />
          </AnimIn>
          <AnimIn index={1} style={{ flex: 1 }}>
            <StatTile icon="package_2" value={data.deliveredOrders} label="đơn đã nhận" desc="rau về tận cửa" />
          </AnimIn>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <AnimIn index={2} style={{ flex: 1 }}>
            <StatTile icon="payments" value={formatVND(data.toFarmers)} label="đến tay nhà vườn" desc="không qua trung gian" />
          </AnimIn>
          <AnimIn index={3} style={{ flex: 1 }}>
            <StatTile icon="stars" value={data.pendingPoints} label="điểm đang chờ" desc="đơn đang thu hoạch / giao" />
          </AnimIn>
        </View>
      </View>

      <View>
        <Text style={styles.sectionTitle}><Icon name="workspace_premium" size={20} filled color={colors.primary} /> Các hạng</Text>
        <Text style={[styles.body, { marginBottom: 12 }]}>Vuốt để xem cả 12 hạng, từ hạt mầm đến huyền thoại.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} decelerationRate="fast" snapToInterval={cardW + 10} contentOffset={{ x: Math.max(0, (lv.index - 1) * (cardW + 10)), y: 0 }}>
          {LEVELS.map((l, i) => {
            const reached = i <= lv.index;
            const active = i === lv.index;
            return (
              <View key={l.name} style={[styles.levelCard, elevation[1], { width: cardW }, active && { backgroundColor: colors.primaryContainer }, !reached && { opacity: 0.55 }]}>
                <Icon name={l.icon} size={36} />
                <Text style={[styles.levelName, active && { color: colors.onPrimaryContainer }]}>{l.name}</Text>
                <Text style={[styles.body, active && { color: colors.onPrimaryContainer }]}>{l.desc}</Text>
                <Text style={[styles.levelMin, active && { color: colors.onPrimaryContainer }]}>{active ? "Bạn đang ở đây" : reached ? "Đã đạt ✓" : `từ ${l.min} điểm`}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View>
        <Text style={styles.sectionTitle}><Icon name="shopping_basket" size={20} filled color={colors.primary} /> Đơn đã nhận gần đây</Text>
        {data.recent.length === 0 ? (
          <Text style={styles.body}>Chưa có đơn nào giao xong. Rau về tới cửa là điểm về tay.</Text>
        ) : (
          <View style={{ gap: 8, marginTop: 8 }}>
            {data.recent.map((o, i) => (
              <AnimIn key={o.id} index={i}>
                <View style={styles.orderRow}>
                  <View style={styles.orderIcon}>
                    <Icon name="home" size={18} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.orderFarm}>{o.farm_name ?? "Vườn rau"}</Text>
                    <Text style={styles.body}>{formatDate(o.created_at)} · {o.farm_location}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.orderTotal}>{formatVND(o.total)}</Text>
                    <Text style={[styles.body, { color: colors.primary }]}>+{Math.floor(o.total / 1000)} điểm</Text>
                  </View>
                </View>
              </AnimIn>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", padding: 24 },
  body: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  hero: { backgroundColor: colors.primaryContainer, borderRadius: shape.xlIncreased, padding: 24, alignItems: "center", overflow: "hidden" },
  heroEyebrow: { ...type.labelLarge, color: colors.onPrimaryContainer, opacity: 0.8, marginTop: 4, fontSize: 11, letterSpacing: 0.8 },
  heroTitle: { ...type.headlineSmall, color: colors.onPrimaryContainer, fontSize: 28, marginTop: 2 },
  heroDesc: { ...type.bodyMedium, color: colors.onPrimaryContainer, opacity: 0.85, marginTop: 2 },
  heroPoints: { ...type.titleLarge, color: colors.onPrimaryContainer, marginTop: 12, fontSize: 24 },
  heroNext: { ...type.bodyMedium, color: colors.onPrimaryContainer, textAlign: "center", marginTop: 8, fontSize: 12 },
  sectionTitle: { ...type.titleLarge, color: colors.onSurface, fontSize: 18, marginBottom: 4 },
  levelCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 14, gap: 2 },
  levelName: { ...type.titleMedium, color: colors.onSurface, fontSize: 15, marginTop: 4 },
  levelMin: { ...type.labelLarge, color: colors.primary, fontSize: 11, marginTop: 6 },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 12 },
  orderIcon: { width: 40, height: 40, borderRadius: shape.md, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
  orderFarm: { ...type.titleMedium, color: colors.onSurface, fontSize: 14 },
  orderTotal: { ...type.labelLarge, color: colors.onSurface, fontSize: 14 },
});
