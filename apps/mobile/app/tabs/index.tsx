import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, useWindowDimensions } from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation, useStyles, type Colors } from "../../constants/theme";
import { BENEFITS, FARMER_POINTS, MODEL_STEPS, TONES, type LandingTone } from "../../constants/landing";
import { groupMixes } from "../../constants/commerce";
import { formatDay, greetingOf } from "../../constants/format";
import type { Feed } from "../../constants/types";
import { useSession } from "../../hooks/useSession";
import { useAddress } from "../../hooks/useAddress";
import { useLiveRefresh } from "../../hooks/useLive";
import { AnimIn, AnimInScale, HeroBlob, PressableScale, Skeleton } from "../../components/motion";
import { Button, Chip, SectionHead, Screen } from "../../components/ui";
import { MixCard } from "../../components/MixCard";
import { GroupCard } from "../../components/GroupCard";
import { CutoffBanner } from "../../components/CutoffBanner";
import { StatusBanner } from "../../components/OrderTimeline";
import { SmartImage } from "../../components/SmartImage";
import { Icon } from "../../components/Icon";

const tone = (): Record<LandingTone, { bg: string; fg: string }> => ({
  primary: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
  tertiary: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer },
  secondary: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
});

const pilotText = (feed: Feed) => {
  const city = feed.pilot?.city ?? "Hà Nội";
  const provinces = feed.pilot?.provinces?.length ? feed.pilot.provinces : ["Bắc Kạn", "Tuyên Quang"];
  return { city, provinces: provinces.join(" và ") };
};

export default function HomeScreen() {
  const styles = useStyles(makeStyles);
  const { user, loading: sessionLoading } = useSession();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setFeed(await apiFetch("/feed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    }
  }, []);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Farmers only have the harvest command screen.
  if (!sessionLoading && user?.role === "farmer") return <Redirect href="/tabs/farmer" />;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 28 }}
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
        {error && <Text style={styles.error}>{error}</Text>}
        {!feed || sessionLoading ? <HomeSkeleton /> : user ? <FeedView feed={feed} /> : <LandingView feed={feed} />}
      </ScrollView>
    </Screen>
  );
}

function HomeSkeleton() {
  return (
    <View style={{ gap: 14 }}>
      <Skeleton height={220} radius={shape.xlIncreased} />
      <Skeleton height={76} radius={shape.xl} />
      <Skeleton height={24} width="50%" />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Skeleton height={260} radius={shape.xl} width="70%" />
        <Skeleton height={260} radius={shape.xl} width="70%" />
      </View>
      <Skeleton height={120} radius={shape.xl} />
    </View>
  );
}

/* ───────────────────────────── Signed-in home ───────────────────────────── */

function FeedView({ feed }: { feed: Feed }) {
  // "Chào chị Lan": how the server says this customer is addressed.
  const { call } = useAddress();
  const styles = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const cardW = Math.min(320, width * 0.84);
  const mixes = groupMixes(feed.boxes);
  const farmW = Math.min(200, width * 0.5);
  const pilot = pilotText(feed);
  const live = feed.live_order;
  // The user's own building first, then the rest in the order the server sent them.
  const groups = [...(feed.groups ?? [])].sort((a, b) => Number(b.cluster_id === feed.my_cluster_id) - Number(a.cluster_id === feed.my_cluster_id));

  return (
    <>
      <AnimInScale>
        <View style={styles.hero}>
          <HeroBlob size={300} right={-90} top={-130} />
          <HeroBlob size={180} right={140} top={120} delay={2000} color="rgba(255,255,255,.18)" />
          <Text style={styles.eyebrow}>{greetingOf({ call_name: call })}, nhà mình ăn rau gì tuần này?</Text>
          <Text style={styles.heroTitle}>Thùng rau mẹ gửi</Text>
          <Text style={styles.heroBody}>
            Rau theo mùa từ các vườn {pilot.provinces}. Đặt trước 18h00, 4h00 sáng bác nông dân cắt đúng lượng, 16h00 hộp rau có mặt ở sảnh nhà bạn.
          </Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 18, alignItems: "center" }}>
            <Button label="Chọn hộp rau" icon="inventory_2" onPress={() => router.push("/tabs/hop-rau")} />
            <Button label="Gói định kỳ" icon="event_repeat" variant="tonal" onPress={() => router.push("/dinh-ky")} style={{ backgroundColor: colors.surfaceContainerLowest }} />
          </View>
        </View>
      </AnimInScale>

      <AnimIn delay={60}>
        <CutoffBanner cutoffAt={feed.cutoff_at} deliveryDate={feed.delivery_date} />
      </AnimIn>

      {live && (
        <AnimIn delay={100}>
          <PressableScale style={[styles.liveCard, elevation[2]]} onPress={() => router.push(`/don-hang/${live.id}`)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <SmartImage uri={live.box?.image_url} style={styles.livePhoto} loaderSize={20} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.liveEyebrow}>Hộp rau của bạn</Text>
                <Text style={styles.liveTitle} numberOfLines={1}>
                  {live.quantity} × {live.box?.name ?? "Hộp rau"}
                </Text>
                <Text style={styles.muted}>Giao {formatDay(live.delivery_date)}</Text>
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <StatusBanner status={live.status} farmer={live.farmers?.find((f) => f.farmer)?.farmer} />
            </View>
            <View style={styles.liveLink}>
              <Text style={styles.liveLinkText}>Xem hành trình hộp rau</Text>
              <Icon name="arrow_forward" size={18} color={colors.primary} />
            </View>
          </PressableScale>
        </AnimIn>
      )}

      <View>
        <SectionHead icon="inventory_2" title="Hộp rau mùa này" action="Xem tất cả" onAction={() => router.push("/tabs/hop-rau")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16, paddingBottom: 6 }} decelerationRate="fast" snapToInterval={cardW + 12}>
          {mixes.map((mix, i) => (
            <AnimIn key={mix.mix} index={i} delay={140}>
              <MixCard mix={mix} style={{ width: cardW }} onOpen={(slug) => router.push(`/hop-rau/${slug}`)} />
            </AnimIn>
          ))}
        </ScrollView>
        {feed.boxes.length === 0 && <Text style={styles.muted}>Các hộp rau mùa mới đang được chuẩn bị.</Text>}
      </View>

      <View>
        <SectionHead icon="groups" title="Gom đơn đang mở" action="Xem tất cả" onAction={() => router.push("/tabs/gom-don")} />
        {groups.length > 0 ? (
          <View style={{ gap: 12 }}>
            {groups.slice(0, 4).map((g, i) => (
              <AnimIn key={g.id} index={i} delay={180}>
                <GroupCard group={g} mine={!!feed.my_cluster_id && g.cluster_id === feed.my_cluster_id} onPress={() => router.push(`/tabs/gom-don/${g.id}`)} />
              </AnimIn>
            ))}
          </View>
        ) : (
          <View style={styles.hintCard}>
            <Icon name="group_add" size={24} color={colors.onSecondaryContainer} />
            <Text style={[styles.muted, { flex: 1, color: colors.onSecondaryContainer }]}>Chưa có nhóm nào đang mở. Tạo nhóm cho toà nhà của bạn, đủ người là cả nhóm miễn phí giao.</Text>
          </View>
        )}
      </View>

      {feed.farms.length > 0 && (
        <View>
          <SectionHead icon="potted_plant" title="Vườn trồng rau cho bạn" action="Xem tất cả" onAction={() => router.push("/farms")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16, paddingBottom: 6 }}>
            {feed.farms.map((farm, i) => (
              <AnimIn key={farm.id} index={Math.min(i, 6)} delay={220}>
                <PressableScale style={[styles.farmCard, elevation[1], { width: farmW }]} onPress={() => router.push(`/farms/${farm.slug}`)}>
                  <SmartImage uri={farm.cover_url} style={styles.farmMedia} loaderSize={22} />
                  <View style={{ padding: 12 }}>
                    <Text style={styles.farmName} numberOfLines={1}>{farm.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Icon name="location_on" size={13} filled color={colors.onSurfaceVariant} />
                      <Text style={styles.muted} numberOfLines={1}>{farm.province}</Text>
                    </View>
                  </View>
                </PressableScale>
              </AnimIn>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}

/* ───────────────────────────── Visitor landing ───────────────────────────── */

function LandingView({ feed }: { feed: Feed }) {
  const styles = useStyles(makeStyles);
  const [openTip, setOpenTip] = useState<string | null>(null);
  const pilot = pilotText(feed);
  const mixes = groupMixes(feed.boxes);

  return (
    <>
      <AnimInScale>
        <View style={styles.hero}>
          <HeroBlob size={320} right={-100} top={-140} />
          <HeroBlob size={200} right={150} top={140} delay={2500} color="rgba(255,255,255,.18)" />
          <View style={styles.heroChip}>
            <Icon name="eco" size={14} filled color={colors.primary} />
            <Text style={styles.heroChipText}>Thí điểm tại {pilot.city}</Text>
          </View>
          <Text style={[styles.heroTitle, { fontSize: 32, lineHeight: 38 }]}>Thùng rau mẹ gửi</Text>
          <Text style={styles.heroBody}>
            Đặt trước hộp rau theo mùa cho cả nhà. Bác nông dân chỉ cắt đúng lượng đã có người đặt, xe lạnh chở thẳng về sảnh chung cư của bạn ngay chiều hôm sau.
          </Text>

          <View style={{ gap: 10, marginTop: 20 }}>
            <PressableScale style={styles.ctaCard} onPress={() => router.push("/dang-nhap?role=customer")}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <View style={[styles.leading, { backgroundColor: colors.primaryContainer }]}>
                  <Icon name="inventory_2" size={22} color={colors.onPrimaryContainer} />
                </View>
                <View>
                  <Text style={styles.ctaEyebrow}>Cho cư dân chung cư</Text>
                  <Text style={styles.ctaTitle}>Đặt hộp rau</Text>
                </View>
              </View>
              <Text style={styles.muted}>Mua một lần, đăng ký gói định kỳ hoặc gom đơn cùng toà nhà. Theo dõi hộp rau theo từng giờ.</Text>
              <Text style={[styles.ctaLink, { color: colors.primary }]}>Dùng thử tài khoản khách →</Text>
            </PressableScale>
            <PressableScale style={styles.ctaCard} onPress={() => router.push("/dang-nhap?role=farmer")}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <View style={[styles.leading, { backgroundColor: colors.tertiaryContainer }]}>
                  <Icon name="agriculture" size={22} color={colors.onTertiaryContainer} />
                </View>
                <View>
                  <Text style={[styles.ctaEyebrow, { color: colors.tertiary }]}>Cho bác nông dân</Text>
                  <Text style={styles.ctaTitle}>Lệnh thu hoạch</Text>
                </View>
              </View>
              <Text style={styles.muted}>Mỗi ngày một tin nhắn, một nút xác nhận. Cắt đúng lượng, không lo rau thừa.</Text>
              <Text style={[styles.ctaLink, { color: colors.tertiary }]}>Dùng thử tài khoản nhà vườn →</Text>
            </PressableScale>
          </View>

          <View style={{ flexDirection: "row", gap: 24, marginTop: 22, flexWrap: "wrap" }}>
            {[
              { v: feed.stats?.farms ?? 0, l: "vườn cùng trồng" },
              { v: feed.stats?.clusters ?? 0, l: "cụm chung cư" },
              { v: feed.stats?.boxes_delivered ?? 0, l: "hộp đã giao" },
            ].map((s) => (
              <View key={s.l}>
                <Text style={styles.statV}>{s.v.toLocaleString("vi-VN")}</Text>
                <Text style={styles.statL}>{s.l}</Text>
              </View>
            ))}
          </View>
        </View>
      </AnimInScale>

      <View>
        <Text style={styles.centerEyebrow}>Cách hoạt động</Text>
        <Text style={styles.centerTitle}>Bốn mốc giờ, không một mớ rau thừa</Text>
        <View style={{ marginTop: 16 }}>
          {MODEL_STEPS.map((s, i) => {
            const last = i === MODEL_STEPS.length - 1;
            return (
              <AnimIn key={s.t} index={i}>
                <View style={{ flexDirection: "row", gap: 14 }}>
                  <View style={{ alignItems: "center" }}>
                    <View style={styles.stepIcon}>
                      <Icon name={s.icon} size={22} filled color={colors.onPrimary} />
                    </View>
                    {!last && <View style={styles.stepLine} />}
                  </View>
                  <View style={[styles.stepCard, !last && { marginBottom: 12 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <Text style={[styles.pillarEyebrow, { color: colors.primary }]}>Bước {i + 1}</Text>
                      <Chip label={s.time} icon="schedule" tone="primary" small />
                    </View>
                    <Text style={styles.cardTitle}>{s.t}</Text>
                    <Text style={styles.muted}>{s.d}</Text>
                  </View>
                </View>
              </AnimIn>
            );
          })}
        </View>
      </View>

      {mixes.length > 0 && (
        <View>
          <Text style={styles.centerEyebrow}>Hộp mùa này</Text>
          <Text style={styles.centerTitle}>Chọn mix, chọn size cho nhà bạn</Text>
          <View style={{ gap: 12, marginTop: 16 }}>
            {mixes.map((mix, i) => (
              <AnimIn key={mix.mix} index={i}>
                <MixCard mix={mix} onOpen={(slug) => router.push(`/hop-rau/${slug}`)} />
              </AnimIn>
            ))}
          </View>
        </View>
      )}

      <View>
        <Text style={styles.centerEyebrow}>Cho người mua</Text>
        <Text style={styles.centerTitle}>Bạn được gì trong mỗi hộp rau</Text>
        <View style={{ gap: 10, marginTop: 16 }}>
          {BENEFITS.map((b, i) => {
            const t = tone()[TONES[i % TONES.length]];
            const open = openTip === b.t;
            return (
              <AnimIn key={b.t} index={Math.min(i, 6)}>
                <PressableScale scaleTo={0.985} style={[styles.benefit, { backgroundColor: t.bg }]} onPress={() => setOpenTip(open ? null : b.t)}>
                  <View style={styles.pillarIcon}>
                    <Icon name={b.icon} size={22} filled color={t.fg} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.tileTitle, { color: t.fg }]}>{b.t}</Text>
                    <Text style={[styles.tileDesc, { color: t.fg }]}>{b.d}</Text>
                    {open && (
                      <AnimIn>
                        <Text style={[styles.tileMore, { color: t.fg }]}>{b.more}</Text>
                      </AnimIn>
                    )}
                  </View>
                  <Icon name={open ? "expand_less" : "expand_more"} size={22} color={t.fg} />
                </PressableScale>
              </AnimIn>
            );
          })}
        </View>
      </View>

      <View style={styles.farmerSection}>
        <Text style={[styles.centerEyebrow, { color: colors.tertiary, textAlign: "left" }]}>Cho bác nông dân</Text>
        <Text style={[styles.centerTitle, { textAlign: "left" }]}>Bác chỉ việc trồng, cắt bao nhiêu đã có người đặt</Text>
        <Text style={[styles.muted, { marginTop: 6 }]}>Màn hình nhà vườn chỉ có một việc: đọc lệnh thu hoạch và bấm xác nhận. Chữ to, dễ đọc, không cần rành công nghệ.</Text>
        <View style={{ gap: 10, marginTop: 16 }}>
          {FARMER_POINTS.map((p, i) => (
            <AnimIn key={p.t} index={i}>
              <View style={[styles.farmerCard, elevation[1]]}>
                <View style={[styles.leading, { backgroundColor: colors.tertiaryContainer }]}>
                  <Icon name={p.icon} size={20} filled color={colors.onTertiaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{p.t}</Text>
                  <Text style={styles.muted}>{p.d}</Text>
                </View>
              </View>
            </AnimIn>
          ))}
        </View>
        <Button label="Xem màn hình nhà vườn" icon="agriculture" variant="tertiary" onPress={() => router.push("/dang-nhap?role=farmer")} style={{ marginTop: 16 }} />
      </View>

      <AnimIn>
        <View style={styles.pilot}>
          <Icon name="location_on" size={24} filled color={colors.onSecondaryContainer} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.onSecondaryContainer }]}>Đang thí điểm tại {pilot.city}</Text>
            <Text style={[styles.muted, { color: colors.onSecondaryContainer }]}>
              Rau đến từ các vườn ở {pilot.provinces}, giao tới sảnh các cụm chung cư tham gia thí điểm. Chưa giao tận cửa từng căn hộ.
            </Text>
          </View>
        </View>
      </AnimIn>

      <AnimIn>
        <View style={styles.finalCta}>
          <HeroBlob size={260} right={-120} top={80} color="rgba(255,255,255,.12)" />
          <Text style={styles.finalTitle}>Thử cả hai đầu, không cần đăng ký</Text>
          <Text style={styles.finalBody}>Tài khoản khách có sẵn đơn hàng, gói định kỳ và nhóm gom đơn. Tài khoản nhà vườn có sẵn lệnh thu hoạch để bạn bấm xác nhận.</Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 18 }}>
            <PressableScale haptic style={[styles.finalBtn, { backgroundColor: colors.onPrimary }]} onPress={() => router.push("/dang-nhap?role=customer")}>
              <Text style={[styles.finalBtnText, { color: colors.primary }]}>Tôi là khách hàng</Text>
            </PressableScale>
            <PressableScale haptic style={[styles.finalBtn, { backgroundColor: colors.primaryContainer }]} onPress={() => router.push("/dang-nhap?role=farmer")}>
              <Text style={[styles.finalBtnText, { color: colors.onPrimaryContainer }]}>Tôi là nhà vườn</Text>
            </PressableScale>
          </View>
        </View>
      </AnimIn>
    </>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    error: { color: colors.error },
    muted: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },
    leading: { width: 44, height: 44, borderRadius: shape.md, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },

    hero: { backgroundColor: colors.primaryContainer, borderRadius: shape.xlIncreased, padding: 22, overflow: "hidden" },
    eyebrow: { ...type.labelLarge, color: colors.primary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
    heroTitle: { ...type.headlineSmall, color: colors.onPrimaryContainer, fontSize: 30, lineHeight: 36, marginBottom: 10 },
    heroBody: { ...type.bodyLarge, color: colors.onSecondaryContainer, fontSize: 15, lineHeight: 22 },
    heroChip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.full, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 14 },
    heroChipText: { ...type.labelLarge, color: colors.primary, fontSize: 12, lineHeight: 16 },
    statV: { ...type.headlineSmall, color: colors.onPrimaryContainer, fontSize: 24 },
    statL: { ...type.bodyMedium, color: colors.onSecondaryContainer, fontSize: 12 },

    ctaCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 18 },
    ctaEyebrow: { ...type.labelLarge, color: colors.primary, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 },
    ctaTitle: { ...type.titleLarge, color: colors.onSurface, fontSize: 18 },
    ctaLink: { ...type.labelLarge, marginTop: 10, fontSize: 13 },

    liveCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 16 },
    livePhoto: { width: 64, height: 64, borderRadius: shape.lg },
    liveEyebrow: { ...type.labelLarge, color: colors.primary, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 },
    liveTitle: { ...type.titleMedium, color: colors.onSurface, fontSize: 17 },
    liveLink: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 12 },
    liveLinkText: { ...type.labelLarge, color: colors.primary, fontSize: 13 },

    hintCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.secondaryContainer, borderRadius: shape.xl, padding: 16 },

    farmCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, overflow: "hidden" },
    farmMedia: { height: 110 },
    farmName: { ...type.titleMedium, color: colors.onSurface, fontSize: 15 },

    centerEyebrow: { ...type.labelLarge, color: colors.primary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, textAlign: "center" },
    centerTitle: { ...type.headlineSmall, color: colors.onSurface, fontSize: 24, textAlign: "center", marginTop: 4 },
    cardTitle: { ...type.titleMedium, color: colors.onSurface, fontSize: 15, marginBottom: 2 },

    stepIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    stepLine: { flex: 1, width: 3, borderRadius: 2, backgroundColor: colors.primaryContainer, marginVertical: 4 },
    stepCard: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 16, gap: 2 },


    benefit: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: shape.xl, padding: 16 },
    pillarIcon: { width: 44, height: 44, borderRadius: shape.md, backgroundColor: colors.tintOverlayStrong, alignItems: "center", justifyContent: "center" },
    pillarEyebrow: { ...type.labelLarge, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 },
    tileTitle: { ...type.titleMedium, fontSize: 15 },
    tileDesc: { ...type.bodyMedium, fontSize: 13, opacity: 0.85, marginTop: 2 },
    tileMore: { ...type.bodyMedium, fontSize: 13, marginTop: 8, lineHeight: 19 },

    farmerSection: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xxl, padding: 20 },
    farmerCard: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 16 },

    pilot: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.secondaryContainer, borderRadius: shape.xl, padding: 18 },

    finalCta: { backgroundColor: colors.primary, borderRadius: shape.xxl, padding: 26, alignItems: "center", overflow: "hidden" },
    finalTitle: { ...type.headlineSmall, color: colors.onPrimary, fontSize: 22, textAlign: "center" },
    finalBody: { ...type.bodyMedium, color: colors.onPrimary, opacity: 0.85, textAlign: "center", marginTop: 8 },
    finalBtn: { borderRadius: shape.full, paddingVertical: 13, paddingHorizontal: 20 },
    finalBtnText: { ...type.labelLarge, fontSize: 14 },
  });
