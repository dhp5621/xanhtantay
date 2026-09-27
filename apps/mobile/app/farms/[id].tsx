import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, router } from "expo-router";
import type { Farm, Product, FarmDiaryEntry } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, elevation, emojiFont, useStyles } from "../../constants/theme";
import { CATEGORY_LABELS, CATEGORY_ICONS, formatVND, formatDateTime, timeAgo } from "../../constants/format";
import { useCart } from "../../hooks/useCart";
import { useSession } from "../../hooks/useSession";
import { useLiveRefresh } from "../../hooks/useLive";
import { AnimIn, AnimInScale, PressableScale, Skeleton } from "../../components/motion";
import { Button, Chip, SectionHead } from "../../components/ui";
import { CartStepper } from "../../components/CartStepper";
import { MediaGallery } from "../../components/MediaGallery";
import { Icon } from "../../components/Icon";
import type { Colors } from "../../constants/theme";
import { useDialog } from "../../components/Dialog";
import { Loader } from "../../components/Loader";
import { EmojiText } from "../../components/EmojiText";

const FOLLOWS_KEY = "xtt-follows";

/** Mirrors apps/web/src/app/(customer)/farms/[slug]/page.tsx. */
export default function FarmDetailScreen() {
  const { alert } = useDialog();
  const styles = useStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const cart = useCart();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [diary, setDiary] = useState<FarmDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [freq, setFreq] = useState<"weekly" | "monthly">("weekly");
  const [subBusy, setSubBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return Promise.resolve();
    return Promise.all([apiFetch(`/farms/${id}`), apiFetch(`/products?farm_id=${id}`), apiFetch(`/farms/${id}/diary`).catch(() => [])])
      .then(([farmRow, productRows, diaryRows]) => {
        setFarm(farmRow);
        setProducts(productRows);
        setDiary(diaryRows ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được dữ liệu"))
      .finally(() => setLoading(false));
  }, [id]);
  useLiveRefresh(load);

  useEffect(() => {
    load();
    if (!id) return;
    AsyncStorage.getItem(FOLLOWS_KEY)
      .then((raw) => setFollowing(((JSON.parse(raw ?? "[]") as string[]) ?? []).includes(id)))
      .catch(() => {});
  }, [id, load]);

  // A farmer only reaches this page for their own farm; show it as a preview, no buying.
  const preview = user?.role === "farmer";

  const toggleFollow = useCallback(async () => {
    if (!farm) return;
    let list: string[] = [];
    try {
      list = JSON.parse((await AsyncStorage.getItem(FOLLOWS_KEY)) ?? "[]");
    } catch {}
    const next = following ? list.filter((x) => x !== farm.id) : Array.from(new Set([...list, farm.id]));
    AsyncStorage.setItem(FOLLOWS_KEY, JSON.stringify(next)).catch(() => {});
    setFollowing(!following);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [farm, following]);

  const farmLines = useMemo(() => (farm ? cart.lines.filter((l) => l.farm_id === farm.id) : []), [cart.lines, farm]);

  const startSubscribe = () => {
    if (!user) {
      router.push(`/dang-nhap?next=/farms/${id}`);
      return;
    }
    if (!farmLines.length) {
      alert("Giao định kỳ", "Thêm vài món của vườn này vào giỏ trước, rồi đăng ký giao định kỳ.");
      return;
    }
    setSubOpen(true);
  };

  const submitSubscribe = async () => {
    if (!farm) return;
    setSubBusy(true);
    try {
      await apiFetch("/subscriptions", {
        method: "POST",
        body: JSON.stringify({ farm_id: farm.id, frequency: freq, items: farmLines.map((l) => ({ product_id: l.id, quantity: l.quantity })) }),
      });
      cart.clearFarm(farm.id);
      setSubOpen(false);
      alert("Đã tạo gói giao định kỳ!", "Rau sẽ tự lên đơn mỗi kỳ theo lịch bạn chọn.", [
        { text: "Đóng", style: "cancel" },
        { text: "Xem gói", onPress: () => router.push("/dinh-ky") },
      ]);
    } catch (e) {
      alert("Không đăng ký được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setSubBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, padding: 16, gap: 12 }}>
        <Skeleton height={220} radius={shape.xlIncreased} />
        <Skeleton height={20} width="60%" />
        <Skeleton height={14} width="40%" />
        <Skeleton height={80} radius={shape.xl} />
        <Skeleton height={90} radius={shape.lgIncreased} />
        <Skeleton height={90} radius={shape.lgIncreased} />
      </View>
    );
  }

  if (error || !farm) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Không tìm thấy vườn"}</Text>
      </View>
    );
  }

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});
  const inStock = products.filter((p) => p.in_stock && p.stock_qty > 0).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ title: farm.name }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: cart.count > 0 ? 110 : 32, gap: 24 }}>
        {preview && (
          <AnimIn>
            <View style={styles.previewBanner}>
              <Icon name="visibility" size={20} />
              <Text style={[styles.body, { color: colors.onTertiaryContainer, flex: 1 }]}>Bạn đang xem vườn của mình như khách hàng nhìn thấy.</Text>
              <Button label="Sửa tồn kho" small variant="filled" style={{ backgroundColor: colors.onTertiaryContainer }} onPress={() => router.push("/tabs/farmer-san-pham")} />
            </View>
          </AnimIn>
        )}

        <AnimInScale>
          <View style={styles.hero}>
            {farm.cover_url ? <Image source={{ uri: farm.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primaryContainer }]} />}
            <LinearGradient colors={["transparent", "rgba(0,0,0,.65)"]} style={StyleSheet.absoluteFill} />
            <View style={{ position: "absolute", left: 20, right: 20, bottom: 20 }}>
              <Text style={styles.heroLoc}><Icon name="location_on" size={14} filled color="#fff" /> {farm.location}</Text>
              <Text style={styles.heroTitle}>{farm.name}</Text>
            </View>
          </View>
        </AnimInScale>

        {farm.description ? (
          <AnimIn delay={60}>
            <EmojiText style={styles.description}>{farm.description}</EmojiText>
          </AnimIn>
        ) : null}

        <AnimIn delay={120}>
          <View style={styles.liveCard}>
            <View style={styles.liveIcon}>
              <Icon name="videocam" size={24} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.liveTitle}>Livestream tại vườn</Text>
              <Text style={styles.body}>Chưa có phiên live nào. Theo dõi để nhận thông báo khi bắt đầu.</Text>
            </View>
          </View>
          {!preview && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Button label={following ? "Đang theo dõi" : "Theo dõi"} icon={following ? "notifications_active" : "notifications"} variant={following ? "filled" : "tonal"} small onPress={toggleFollow} />
              <Button label="Giao định kỳ" icon="event_repeat" variant="outlined" small onPress={startSubscribe} />
            </View>
          )}
        </AnimIn>

        <View>
          <SectionHead icon="shopping_basket" title="Sản phẩm từ vườn" />
          <Text style={[styles.body, { marginTop: -8, marginBottom: 12 }]}>{inStock} món còn hàng</Text>
          {products.length === 0 && <Text style={styles.body}>Vườn chưa có sản phẩm nào.</Text>}
          {Object.entries(grouped).map(([cat, items], gi) => (
            <View key={cat} style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Icon name={CATEGORY_ICONS[cat] ?? "eco"} size={18} color={colors.onSurfaceVariant} />
                <Text style={[styles.catLabel, { marginBottom: 0 }]}>{(CATEGORY_LABELS[cat] ?? cat).toUpperCase()}</Text>
              </View>
              <View style={{ gap: 8 }}>
                {items.map((p, i) => {
                  const soldOut = !p.in_stock || p.stock_qty <= 0;
                  return (
                    <AnimIn key={p.id} index={gi * 2 + i} delay={160}>
                      <View style={[styles.productCard, elevation[1], soldOut && { opacity: 0.6 }]}>
                        <View style={styles.productImage}>
                          {p.image_url ? <Image source={{ uri: p.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} /> : <Icon name={CATEGORY_ICONS[p.category]} size={26} />}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.productName}>{p.name}</Text>
                          <Text style={styles.productPrice}>
                            {formatVND(p.price_per_unit)} <Text style={styles.unit}>/ {p.unit}</Text>
                          </Text>
                          {soldOut ? (
                            <Chip icon="block" label="Hết hàng" tone="error" small style={{ marginTop: 6 }} />
                          ) : (
                            <Chip icon={p.stock_qty <= 5 ? "priority_high" : "inventory_2"} label={p.stock_qty <= 5 ? `Chỉ còn ${p.stock_qty} ${p.unit}` : `Còn ${p.stock_qty} ${p.unit}`} tone={p.stock_qty <= 5 ? "error" : "surface"} small style={{ marginTop: 6 }} />
                          )}
                        </View>
                        {!preview && !soldOut && (
                          <CartStepper compact max={p.stock_qty} product={{ id: p.id, name: p.name, unit: p.unit, price_per_unit: p.price_per_unit, farm_id: farm.id, farm_name: farm.name, farm_slug: farm.slug, farm_location: farm.location }} />
                        )}
                      </View>
                    </AnimIn>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {diary.length > 0 && (
          <View>
            <SectionHead icon="auto_stories" title="Nhật ký vườn" />
            <View style={{ gap: 10 }}>
              {diary.map((entry, i) => (
                <AnimIn key={entry.id} index={Math.min(i, 5)}>
                  <View style={[styles.diaryItem, elevation[1]]}>
                    {entry.media_urls.length ? (
                      <MediaGallery urls={entry.media_urls} layout="thumb" size={96} tag={farm.name} caption={formatDateTime(entry.created_at)} />
                    ) : (
                      <View style={styles.leading}>
                        <Icon name="eco" size={22} />
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <TouchableOpacity onPress={() => router.push(`/nhat-ky/${entry.id}`)}>
                        <EmojiText style={styles.diaryContent} numberOfLines={4}>{entry.content}</EmojiText>
                      </TouchableOpacity>
                      <Text style={styles.diaryMeta}>
                        <Icon name="schedule" size={12} color={colors.onSurfaceVariant} /> <Text style={{ fontWeight: "700" }}>{timeAgo(entry.created_at)}</Text> · {formatDateTime(entry.created_at)}
                      </Text>
                      <TouchableOpacity onPress={() => router.push(`/nhat-ky/${entry.id}`)} style={{ marginTop: 6 }}>
                        <Text style={styles.diaryLink}>Xem bài đầy đủ →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </AnimIn>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {cart.count > 0 && !preview && (
        <AnimIn style={styles.cartBarWrap}>
          <PressableScale haptic style={[styles.cartBar, elevation[3]]} onPress={() => router.push("/cart")}>
            <Text style={styles.cartBarText}><Icon name="shopping_basket" size={18} filled color={colors.onPrimary} /> {cart.count} món · {formatVND(cart.total)}</Text>
            <Text style={styles.cartBarCta}>Xem giỏ →</Text>
          </PressableScale>
        </AnimIn>
      )}

      <Modal visible={subOpen} transparent animationType="slide" onRequestClose={() => setSubOpen(false)}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Giao định kỳ</Text>
            <Text style={[styles.body, { marginBottom: 12 }]}>Những món dưới đây (đang trong giỏ, thuộc vườn này) sẽ tự động được đặt lại theo lịch bạn chọn. Các món của vườn khác vẫn ở trong giỏ.</Text>
            <View style={{ gap: 6, marginBottom: 12 }}>
              {farmLines.map((l) => (
                <View key={l.id} style={styles.subLine}>
                  <Icon name="eco" size={18} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.productName} numberOfLines={1}>{l.name}</Text>
                    <Text style={styles.body}>{formatVND(l.price_per_unit)} / {l.unit}</Text>
                  </View>
                  <Text style={styles.productPrice}>{l.quantity} {l.unit}</Text>
                  <Text style={[styles.body, { minWidth: 70, textAlign: "right" }]}>{formatVND(l.price_per_unit * l.quantity)}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={styles.body}>{farmLines.length} món · {farmLines.reduce((s, l) => s + l.quantity, 0)} đơn vị</Text>
              <Text style={styles.body}>
                Mỗi kỳ ≈ <Text style={{ fontWeight: "800", color: colors.primary }}>{formatVND(farmLines.reduce((s, l) => s + l.quantity * l.price_per_unit, 0))}</Text>
              </Text>
            </View>
            <View style={styles.segmented}>
              {(["weekly", "monthly"] as const).map((f) => (
                <TouchableOpacity key={f} style={[styles.seg, freq === f && styles.segSelected]} onPress={() => setFreq(f)}>
                  <Text style={[styles.segText, freq === f && { color: colors.onSecondaryContainer }]}>{f === "weekly" ? "Mỗi tuần" : "Mỗi tháng"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <Button label="Huỷ" variant="text" onPress={() => setSubOpen(false)} />
              <Button label="Đăng ký" icon="check" onPress={submitSubscribe} loading={subBusy} />
            </View>
            {subBusy && <Loader size={22} color={colors.primary} style={{ marginTop: 8 }} />}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  errorText: { color: colors.error },
  body: {  ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },
  leading: { width: 44, height: 44, borderRadius: shape.md, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
  previewBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.tertiaryContainer, borderRadius: shape.lg, padding: 12 },
  hero: { height: 240, borderRadius: shape.xlIncreased, overflow: "hidden", backgroundColor: colors.surfaceContainerHigh },
  heroLoc: { color: "rgba(255,255,255,.9)", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  heroTitle: { ...type.headlineSmall, color: "#fff", fontSize: 28, lineHeight: 34 },
  description: {  ...type.bodyLarge, color: colors.onSurfaceVariant, fontSize: 15, lineHeight: 24 },
  liveCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 16 },
  liveIcon: { width: 52, height: 52, borderRadius: shape.md, backgroundColor: colors.tertiaryContainer, alignItems: "center", justifyContent: "center" },
  liveTitle: { ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
  catLabel: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 12, letterSpacing: 0.6, marginBottom: 10 },
  productCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lgIncreased, padding: 12 },
  productImage: { width: 76, height: 76, borderRadius: shape.lg, backgroundColor: colors.surfaceContainerHigh, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  productName: {  ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
  productPrice: { ...type.labelLarge, color: colors.primary, fontSize: 15, marginTop: 2 },
  unit: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, fontWeight: "400" },
  diaryItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 14 },
  diaryContent: {  ...type.bodyMedium, color: colors.onSurface, fontSize: 14, lineHeight: 21 },
  diaryMeta: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 6 },
  diaryLink: { ...type.labelLarge, color: colors.primary, fontSize: 13 },
  cartBarWrap: { position: "absolute", left: 16, right: 16, bottom: 20 },
  cartBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.primary, borderRadius: shape.full, paddingVertical: 14, paddingHorizontal: 20 },
  cartBarText: { ...type.labelLarge, color: colors.onPrimary, fontSize: 15 },
  cartBarCta: { ...type.labelLarge, color: colors.primaryContainer, fontSize: 14 },
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: shape.xlIncreased, borderTopRightRadius: shape.xlIncreased, padding: 22, paddingBottom: 34 },
  sheetTitle: { ...type.headlineSmall, color: colors.onSurface, fontSize: 22, marginBottom: 4 },
  subLine: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surfaceContainerLow, borderRadius: shape.md, padding: 10 },
  segmented: { flexDirection: "row", borderRadius: shape.full, borderWidth: 1, borderColor: colors.outlineVariant, overflow: "hidden" },
  seg: { flex: 1, paddingVertical: 11, alignItems: "center" },
  segSelected: { backgroundColor: colors.secondaryContainer },
  segText: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 13 },
});
