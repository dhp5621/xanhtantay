import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { KeyboardScroll } from "../../components/keyboard";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Stack, router, useLocalSearchParams } from "expo-router";
import type { Box } from "@xanhtantay/types";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, useStyles, type Colors } from "../../constants/theme";
import { SHIP_FEE, SIZE_LABELS, sizesOf, type OrderMode } from "../../constants/commerce";
import { formatDay, formatKg, formatVND } from "../../constants/format";
import type { BoxesResponse, PlacedOrder } from "../../constants/types";
import { useLiveRefresh } from "../../hooks/useLive";
import { useSession } from "../../hooks/useSession";
import { AnimIn, AnimInScale, HeroBlob, Skeleton } from "../../components/motion";
import { Button, Chip, EmptyState, SectionHead, StatTile } from "../../components/ui";
import { SmartImage } from "../../components/SmartImage";
import { CutoffBanner } from "../../components/CutoffBanner";
import { BoxContents } from "../../components/BoxContents";
import { BoxMenu } from "../../components/BoxMenu";
import { SizePicker } from "../../components/SizePicker";
import { OrderPanel } from "../../components/OrderPanel";
import { CareMessage } from "../../components/CareMessage";
import { StatusBanner } from "../../components/OrderTimeline";
import { Icon } from "../../components/Icon";
import { EmojiText } from "../../components/EmojiText";

const MODES: OrderMode[] = ["single", "subscription", "group"];

/** One box: what is inside, the menu that ships with it, and the order panel. */
export default function BoxDetailScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { slug, mode } = useLocalSearchParams<{ slug: string; mode?: string }>();
  const [box, setBox] = useState<Box | null>(null);
  const [sizes, setSizes] = useState<Box[]>([]);
  const [meta, setMeta] = useState<Omit<BoxesResponse, "boxes"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const [row, list] = await Promise.all([apiFetch(`/boxes/${slug}`) as Promise<Box>, (apiFetch("/boxes") as Promise<BoxesResponse>).catch(() => null)]);
      setBox(row);
      // The other sizes of this mix come from the list; without it the box stands alone.
      setSizes(list ? sizesOf(row, list.boxes ?? []) : []);
      if (list) setMeta({ delivery_date: list.delivery_date, cutoff_at: list.cutoff_at, ship_fee: list.ship_fee });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(load);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, padding: 16, gap: 12 }}>
        <Skeleton height={240} radius={shape.xlIncreased} />
        <Skeleton height={20} width="60%" />
        <Skeleton height={14} width="40%" />
        <Skeleton height={76} radius={shape.xl} />
        <Skeleton height={84} radius={shape.lgIncreased} />
        <Skeleton height={84} radius={shape.lgIncreased} />
      </View>
    );
  }

  if (!box) {
    return (
      <View style={styles.center}>
        <EmptyState icon="inventory_2" title="Không tìm thấy hộp rau" description={error ?? "Hộp này có thể đã hết mùa."} action={<Button label="Xem các hộp đang mở" icon="arrow_back" onPress={() => router.replace("/tabs/hop-rau")} />} />
      </View>
    );
  }

  if (placed) return <PlacedView box={box} order={placed} onAgain={() => setPlaced(null)} />;

  const mixName = box.mix_name || box.name;
  const sizeLabel = `${SIZE_LABELS[box.size] ?? box.size} · ${formatKg(box.weight_kg)}`;
  const initialMode = MODES.includes(mode as OrderMode) ? (mode as OrderMode) : "single";

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ title: mixName }} />
      <KeyboardScroll contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom, gap: 24 }} keyboardShouldPersistTaps="handled">
        <AnimInScale>
          <View style={styles.hero}>
            <SmartImage uri={box.image_url} style={StyleSheet.absoluteFill} loaderSize={32} transition={400} />
            <LinearGradient colors={["transparent", "rgba(0,0,0,.7)"]} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={{ position: "absolute", left: 20, right: 20, bottom: 20 }}>
              {box.season ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <Icon name="eco" size={14} filled color={colors.onImage} />
                  <Text style={styles.heroSeason}>{box.season}</Text>
                </View>
              ) : null}
              <Text style={styles.heroTitle}>{mixName}</Text>
              <Text style={styles.heroSize}>{sizeLabel}</Text>
            </View>
          </View>
        </AnimInScale>

        <AnimIn delay={60}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 }}>
              <Chip label={SIZE_LABELS[box.size] ?? box.size} tone="primary" />
              <Chip icon="monitor_weight" label={formatKg(box.weight_kg)} />
              <Chip icon="restaurant" label={`${box.servings} người ăn · ${box.days} ngày`} />
            </View>
          </View>
          <Text style={styles.price}>{formatVND(box.price)}</Text>
          {box.description ? <EmojiText style={styles.description}>{box.description}</EmojiText> : null}
        </AnimIn>

        {sizes.length > 1 ? (
          <AnimIn delay={80}>
            <View style={styles.sizeCard}>
              <Text style={styles.sizeLabel}>Chọn size</Text>
              {/* replace, not push: Back leaves the mix instead of walking through its sizes. */}
              <SizePicker mixName={mixName} sizes={sizes} current={box.id} onPick={(b) => b.id !== box.id && router.replace(`/hop-rau/${b.slug}`)} />
            </View>
          </AnimIn>
        ) : null}

        {meta ? (
          <AnimIn delay={100}>
            <CutoffBanner cutoffAt={meta.cutoff_at} deliveryDate={meta.delivery_date} />
          </AnimIn>
        ) : null}

        <AnimIn delay={140}>
          <SectionHead icon="inventory_2" title="Trong hộp có gì" />
          <BoxContents items={box.items ?? []} />
        </AnimIn>

        <AnimIn delay={180}>
          <SectionHead icon="menu_book" title={`Thực đơn ${box.days} ngày kèm hộp`} />
          {/* Keyed by box: another size starts from its own menu. Farmers only read it. */}
          <BoxMenu key={box.id} mealPlan={box.meal_plan ?? []} target={user?.role === "farmer" ? undefined : { box: box.slug }} />
        </AnimIn>

        <View>
          <SectionHead icon="shopping_bag" title="Cách nhận hộp rau" />
          <OrderPanel
            box={box}
            deliveryDate={meta?.delivery_date ?? null}
            shipFee={meta?.ship_fee ?? SHIP_FEE}
            initialMode={initialMode}
            onPlaced={(order) => {
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              setPlaced(order);
            }}
          />
        </View>
      </KeyboardScroll>
    </View>
  );
}

/** Shown right after a one-off order: the care message first, then what the order did. */
function PlacedView({ box, order, onAgain }: { box: Box; order: PlacedOrder; onAgain: () => void }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const impact = order.impact;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom, gap: 18 }}>
      <Stack.Screen options={{ title: "Đặt hộp thành công" }} />
      <AnimInScale>
        <View style={styles.done}>
          <HeroBlob size={220} right={-80} top={-100} color={colors.tintOverlay} />
          <View style={styles.doneIcon}>
            <Icon name="celebration" size={34} filled color={colors.onPrimary} />
          </View>
          <Text style={styles.doneTitle}>Đơn đã vào sổ!</Text>
          <Text style={styles.doneBody}>
            {order.quantity} × {order.box?.name ?? box.name}, giao {formatDay(order.delivery_date)} lúc 16h00 tại sảnh{order.cluster ? ` ${order.cluster.name}` : " chung cư nhà bạn"}.
          </Text>
        </View>
      </AnimInScale>

      {order.care_message ? (
        <AnimIn delay={80}>
          <CareMessage message={order.care_message} />
        </AnimIn>
      ) : null}

      <AnimIn delay={140}>
        <StatusBanner status={order.status} />
      </AnimIn>

      {impact ? (
        <AnimIn delay={200}>
          <SectionHead icon="eco" title="Hộp rau này làm được gì" />
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <StatTile icon="payments" value={formatVND(impact.toFarmers)} label="Về tay bác nông dân" tone="primary" />
              <StatTile icon="monitor_weight" value={formatKg(impact.weightKg)} label="Rau cắt đúng lượng" tone="tertiary" />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <StatTile icon="restaurant" value={impact.meals} label="Bữa cơm có sẵn thực đơn" tone="secondary" />
              <StatTile icon="groups" value={impact.servings} label="Người ăn mỗi bữa" />
            </View>
          </View>
        </AnimIn>
      ) : null}

      <AnimIn delay={260}>
        <View style={styles.totalRow}>
          <Text style={styles.muted}>Tổng thanh toán{order.ship_fee ? ` (gồm ${formatVND(order.ship_fee)} phí giao)` : ""}</Text>
          <Text style={styles.barPrice}>{formatVND(order.total)}</Text>
        </View>
        <View style={{ gap: 10, marginTop: 14 }}>
          <Button label="Xem hành trình đơn hàng" icon="favorite" onPress={() => router.replace(`/don-hang/${order.id}`)} style={{ alignSelf: "stretch" }} />
          <Button label="Tất cả đơn hàng" icon="package_2" variant="tonal" onPress={() => router.replace("/tabs/don-hang")} style={{ alignSelf: "stretch" }} />
          <Button label="Đặt thêm hộp nữa" variant="text" onPress={onAgain} style={{ alignSelf: "center" }} />
        </View>
      </AnimIn>
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    center: { flex: 1, backgroundColor: c.surface, justifyContent: "center", padding: 16 },
    muted: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13 },
    hero: { height: 250, borderRadius: shape.xlIncreased, overflow: "hidden", backgroundColor: c.surfaceContainerHigh },
    heroSeason: { color: "rgba(255,255,255,.9)", fontSize: 13, fontWeight: "600" },
    heroTitle: { ...type.headlineSmall, color: c.onImage, fontSize: 28, lineHeight: 34 },
    heroSize: { ...type.titleMedium, color: "rgba(255,255,255,.9)", fontSize: 15, marginTop: 2 },
    sizeCard: { backgroundColor: c.surfaceContainerLow, borderRadius: shape.xl, padding: 16, gap: 10 },
    sizeLabel: { ...type.labelLarge, color: c.onSurfaceVariant },
    price: { ...type.headlineSmall, color: c.primary, fontSize: 28, lineHeight: 34, marginTop: 14 },
    description: { ...type.bodyLarge, color: c.onSurfaceVariant, fontSize: 15, lineHeight: 24, marginTop: 6 },
    barPrice: { ...type.headlineSmall, color: c.primary, fontSize: 20, lineHeight: 26 },
    done: { backgroundColor: c.secondaryContainer, borderRadius: shape.xlIncreased, padding: 24, alignItems: "center", overflow: "hidden" },
    doneIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    doneTitle: { ...type.headlineSmall, color: c.onSecondaryContainer, fontSize: 24 },
    doneBody: { ...type.bodyLarge, color: c.onSecondaryContainer, fontSize: 15, textAlign: "center", marginTop: 6 },
    totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: c.surfaceContainerLow, borderRadius: shape.lg, padding: 14 },
  });
