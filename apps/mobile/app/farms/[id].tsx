import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation, useStyles, type Colors } from "../../constants/theme";
import { formatKg } from "../../constants/format";
import type { FarmProfile } from "../../constants/types";
import { useSession } from "../../hooks/useSession";
import { useLiveRefresh } from "../../hooks/useLive";
import { AnimIn, AnimInScale, Skeleton } from "../../components/motion";
import { Avatar, Button, EmptyState, SectionHead } from "../../components/ui";
import { SmartImage } from "../../components/SmartImage";
import { Icon } from "../../components/Icon";
import { EmojiText } from "../../components/EmojiText";

/** A farm's read-only profile: who grows, where, and what they registered to grow each day. */
export default function FarmDetailScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [farm, setFarm] = useState<FarmProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setFarm(await apiFetch(`/farms/${id}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(load);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, padding: 16, gap: 12 }}>
        <Skeleton height={230} radius={shape.xlIncreased} />
        <Skeleton height={72} radius={shape.xl} />
        <Skeleton height={20} width="60%" />
        <Skeleton height={76} radius={shape.lgIncreased} />
        <Skeleton height={76} radius={shape.lgIncreased} />
      </View>
    );
  }

  if (!farm) {
    return (
      <View style={styles.center}>
        <EmptyState icon="search_off" title="Không tìm thấy vườn" description={error ?? undefined} />
      </View>
    );
  }

  const grows = farm.grows ?? [];
  const dailyTotal = grows.reduce((s, g) => s + Number(g.daily_kg ?? 0), 0);
  const isCustomer = user?.role === "customer";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom, gap: 22 }}
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
      <Stack.Screen options={{ title: farm.name }} />

      <AnimInScale>
        <View style={styles.hero}>
          <SmartImage uri={farm.cover_url} style={StyleSheet.absoluteFill} loaderSize={32} transition={400} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,.7)"]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={{ position: "absolute", left: 20, right: 20, bottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <Icon name="location_on" size={14} filled color={colors.onImage} />
              <Text style={styles.heroLoc} numberOfLines={1}>{farm.province}</Text>
            </View>
            <Text style={styles.heroTitle}>{farm.name}</Text>
          </View>
        </View>
      </AnimInScale>

      <AnimIn delay={60}>
        <View style={[styles.farmerCard, elevation[1]]}>
          <Avatar name={farm.farmer ?? farm.name} src={farm.farmer_avatar} size={56} tone="tertiary" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.eyebrow}>Người trồng</Text>
            <Text style={styles.farmerName} numberOfLines={1}>{farm.farmer ?? "Nhà vườn"}</Text>
            <Text style={styles.body} numberOfLines={2}>{farm.location}</Text>
          </View>
        </View>
      </AnimIn>

      {farm.description ? (
        <AnimIn delay={100}>
          <EmojiText style={styles.description}>{farm.description}</EmojiText>
        </AnimIn>
      ) : null}

      <AnimIn delay={140}>
        <SectionHead icon="eco" title="Vườn đang trồng" />
        {grows.length === 0 ? (
          <Text style={styles.body}>Vườn chưa đăng ký loại rau nào cho mùa này.</Text>
        ) : (
          <>
            <Text style={[styles.body, { marginTop: -6, marginBottom: 12 }]}>
              Sức trồng đã đăng ký: tối đa {formatKg(dailyTotal)} mỗi ngày. Lệnh thu hoạch không bao giờ vượt con số này.
            </Text>
            <View style={{ gap: 8 }}>
              {grows.map((g, i) => (
                <AnimIn key={g.produce_id} index={Math.min(i, 6)} delay={160}>
                  <View style={styles.growRow}>
                    <SmartImage uri={g.image_url} style={styles.growPhoto} loaderSize={20} />
                    <Text style={styles.growName} numberOfLines={1}>{g.name}</Text>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.growKg}>{formatKg(g.daily_kg)}</Text>
                      <Text style={styles.growUnit}>mỗi ngày</Text>
                    </View>
                  </View>
                </AnimIn>
              ))}
            </View>
          </>
        )}
      </AnimIn>

      <AnimIn delay={200}>
        <View style={styles.note}>
          <Icon name="agriculture" size={22} color={colors.onSecondaryContainer} />
          <Text style={[styles.body, { flex: 1, color: colors.onSecondaryContainer }]}>
            Rau của vườn không bán lẻ. Rau được phối vào các hộp theo mùa, và bác nông dân chỉ cắt đúng lượng đã có người đặt trước 18h00.
          </Text>
        </View>
        {isCustomer ? <Button label="Xem các hộp rau" icon="inventory_2" onPress={() => router.push("/tabs/hop-rau")} style={{ marginTop: 14 }} /> : null}
      </AnimIn>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    center: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", padding: 16 },
    body: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },
    eyebrow: { ...type.labelLarge, color: colors.tertiary, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 },
    hero: { height: 240, borderRadius: shape.xlIncreased, overflow: "hidden", backgroundColor: colors.surfaceContainerHigh },
    heroLoc: { color: "rgba(255,255,255,.9)", fontSize: 13, fontWeight: "600" },
    heroTitle: { ...type.headlineSmall, color: colors.onImage, fontSize: 28, lineHeight: 34 },
    farmerCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 16 },
    farmerName: { ...type.titleLarge, color: colors.onSurface, fontSize: 19, lineHeight: 25 },
    description: { ...type.bodyLarge, color: colors.onSurfaceVariant, fontSize: 15, lineHeight: 24 },
    growRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lgIncreased, padding: 10, borderWidth: 1, borderColor: colors.outlineVariant },
    growPhoto: { width: 56, height: 56, borderRadius: shape.md },
    growName: { ...type.titleMedium, color: colors.onSurface, fontSize: 15, flex: 1 },
    growKg: { ...type.labelLarge, color: colors.primary, fontSize: 16 },
    growUnit: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 11, lineHeight: 14 },
    note: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.secondaryContainer, borderRadius: shape.xl, padding: 16 },
  });
