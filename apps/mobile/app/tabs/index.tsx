import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Redirect, router, useFocusEffect } from "expo-router";
import type { Farm, FarmDiaryEntry, GroupOrder } from "@xanhtantay/types";
import type { SessionUser } from "../../constants/api";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation, emojiFont, useStyles } from "../../constants/theme";
import { daysUntil, formatDateTime, timeAgo } from "../../constants/format";
import { PILLARS, PILLAR_TONES, FARMER_POINTS, DAY_STEPS, FEES, HOME_FEATURES } from "../../constants/landing";
import { useSession } from "../../hooks/useSession";
import { AnimIn, AnimInScale, AnimatedProgress, HeroBlob, PressableScale, Skeleton } from "../../components/motion";
import { Chip, Button, SectionHead, Screen } from "../../components/ui";
import { MediaGallery } from "../../components/MediaGallery";
import { Icon } from "../../components/Icon";
import { useLiveRefresh } from "../../hooks/useLive";
import type { Colors } from "../../constants/theme";
import { EmojiText } from "../../components/EmojiText";

interface Feed {
  farms: Farm[];
  diary: (FarmDiaryEntry & { farm: { id: string; name: string; slug: string } | null })[];
  groups: (GroupOrder & { farm_name: string | null })[];
  stats: { farms: number; products: number; groups: number };
}

const tone = (): Record<(typeof PILLAR_TONES)[number], { bg: string; fg: string }> => ({
  primary: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
  tertiary: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer },
  secondary: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
});

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

  // Farmers use the farmer console only (web middleware sends them to /farmer).
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
        {!feed || sessionLoading ? <HomeSkeleton /> : user ? <FeedView feed={feed} user={user} /> : <LandingView feed={feed} />}
      </ScrollView>
    </Screen>
  );
}

function HomeSkeleton() {
  return (
    <View style={{ gap: 14 }}>
      <Skeleton height={200} radius={shape.xlIncreased} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Skeleton height={90} radius={shape.xl} style={{ flex: 1 }} width="30%" />
        <Skeleton height={90} radius={shape.xl} style={{ flex: 1 }} width="30%" />
        <Skeleton height={90} radius={shape.xl} style={{ flex: 1 }} width="30%" />
      </View>
      <Skeleton height={24} width="50%" />
      <Skeleton height={120} radius={shape.xl} />
      <Skeleton height={120} radius={shape.xl} />
    </View>
  );
}

/* ───────────────────────────── Signed-in feed ───────────────────────────── */

function FeedView({ feed, user }: { feed: Feed; user: SessionUser }) {
  const styles = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const cardW = Math.min(280, width * 0.72);
  return (
    <>
      <AnimInScale>
        <View style={styles.hero}>
          <HeroBlob size={300} right={-90} top={-130} />
          <HeroBlob size={180} right={140} top={120} delay={2000} color="rgba(255,255,255,.18)" />
          <Text style={styles.eyebrow}>Chào {user.name?.split(" ").pop()}, hôm nay ăn gì?</Text>
          <Text style={styles.heroTitle}>Biết rõ từng cây rau trước khi lên bàn ăn</Text>
          <Text style={styles.heroBody}>Đặt hàng trực tiếp từ vườn nhà bác Ba, cô Tư, u Thắm. Xem nhật ký canh tác hàng ngày, biết rau thu hoạch lúc nào và đến tay bạn ra sao.</Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <Button label="Khám phá vườn rau" icon="potted_plant" onPress={() => router.push("/tabs/farms")} />
            <Button label="Gom đơn cùng hàng xóm" icon="groups" variant="tonal" onPress={() => router.push("/tabs/gom-don")} style={{ backgroundColor: colors.surfaceContainerLowest }} />
          </View>
        </View>
      </AnimInScale>

      <View style={{ gap: 10 }}>
        {HOME_FEATURES.map((f, i) => {
          const t = tone()[PILLAR_TONES[i]];
          return (
            <AnimIn key={f.title} index={i} delay={100}>
              <View style={[styles.feature, { backgroundColor: t.bg }]}>
                <Icon name={f.icon} size={26} filled color={t.fg} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureTitle, { color: t.fg }]}>{f.title}</Text>
                  <Text style={[styles.featureText, { color: t.fg }]}>{f.text}</Text>
                </View>
              </View>
            </AnimIn>
          );
        })}
      </View>

      <View>
        <SectionHead icon="potted_plant" title="Vườn rau nổi bật" action="Xem tất cả" onAction={() => router.push("/tabs/farms")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }} decelerationRate="fast" snapToInterval={cardW + 12}>
          {feed.farms.map((farm, i) => (
            <AnimIn key={farm.id} index={i} delay={150}>
              <PressableScale style={[styles.farmCard, elevation[1], { width: cardW }]} onPress={() => router.push(`/farms/${farm.id}`)}>
                <View style={styles.farmMedia}>
                  {farm.cover_url ? <Image source={{ uri: farm.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primaryContainer }]} />}
                  <View style={styles.farmLocChip}>
                    <Text style={styles.farmLocText}><Icon name="location_on" size={12} color="#fff" filled /> {farm.location}</Text>
                  </View>
                </View>
                <View style={{ padding: 14 }}>
                  <Text style={styles.farmName}>{farm.name}</Text>
                  {farm.description ? <Text style={styles.farmDesc} numberOfLines={2}>{farm.description}</Text> : null}
                </View>
              </PressableScale>
            </AnimIn>
          ))}
        </ScrollView>
      </View>

      <View>
        <SectionHead icon="auto_stories" title="Nhật ký từ vườn" />
        <View style={{ gap: 10 }}>
          {feed.diary.map((entry, i) => (
            <AnimIn key={entry.id} index={i} delay={200}>
              <PressableScale style={[styles.diaryItem, elevation[1]]} onPress={() => router.push(`/nhat-ky/${entry.id}`)}>
                {entry.media_urls[0] ? (
                  <MediaGallery urls={entry.media_urls} layout="thumb" size={84} tag={entry.farm?.name ?? undefined} />
                ) : (
                  <View style={styles.leading}>
                    <Icon name="eco" size={22} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.diaryFarm}>{entry.farm?.name ?? "Vườn rau"}</Text>
                  <EmojiText style={styles.diaryContent} numberOfLines={3}>{entry.content}</EmojiText>
                  <Text style={styles.diaryMeta}><Icon name="schedule" size={12} color={colors.onSurfaceVariant} /> {timeAgo(entry.created_at)} · {formatDateTime(entry.created_at)}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </PressableScale>
            </AnimIn>
          ))}
          {feed.diary.length === 0 && <Text style={styles.muted}>Chưa có bài nhật ký nào.</Text>}
        </View>
      </View>

      {feed.groups.length > 0 && (
        <View>
          <SectionHead icon="groups" title="Gom đơn đang mở" action="Xem tất cả" onAction={() => router.push("/tabs/gom-don")} />
          <View style={{ gap: 12 }}>
            {feed.groups.map((g, i) => {
              const pct = Math.min(100, Math.round((g.current_members / g.min_members) * 100));
              const freeship = g.current_members >= g.min_members;
              const left = daysUntil(g.deadline);
              return (
                <AnimIn key={g.id} index={i} delay={250}>
                  <PressableScale style={[styles.groupCard, elevation[1]]} onPress={() => router.push(`/tabs/gom-don/${g.id}`)}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.groupTitle} numberOfLines={1}>{g.title}</Text>
                        <Text style={styles.muted}>{g.farm_name}</Text>
                      </View>
                      {freeship && <Chip icon="local_shipping" label="Freeship" tone="primary" small />}
                    </View>
                    <AnimatedProgress value={pct} wavy={!freeship} color={freeship ? colors.primary : colors.secondary} height={6} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                      <Text style={styles.muted}>{g.current_members}/{g.min_members} người</Text>
                      <Text style={[styles.muted, { fontWeight: "700", color: left <= 1 ? colors.error : colors.onSurfaceVariant }]}>{left > 0 ? `Còn ${left} ngày` : "Chốt hôm nay"}</Text>
                    </View>
                  </PressableScale>
                </AnimIn>
              );
            })}
          </View>
        </View>
      )}
    </>
  );
}

/* ───────────────────────────── Visitor landing ───────────────────────────── */

function LandingView({ feed }: { feed: Feed }) {
  const styles = useStyles(makeStyles);
  const [openTip, setOpenTip] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const stepW = Math.min(240, width * 0.66);

  return (
    <>
      <AnimInScale>
        <View style={styles.hero}>
          <HeroBlob size={320} right={-100} top={-140} />
          <HeroBlob size={200} right={150} top={140} delay={2500} color="rgba(255,255,255,.18)" />
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}><Icon name="eco" size={14} filled color={colors.primary} /> Hệ sinh thái nông sản hai đầu: nhà vườn và người ăn</Text>
          </View>
          <Text style={[styles.heroTitle, { fontSize: 30, lineHeight: 36 }]}>Rau tươi gom thẳng từ vườn, có tên người trồng</Text>
          <Text style={styles.heroBody}>Đặt mua nông sản tươi gom trực tiếp từ những nhà vườn có tên có mặt, như bác Ba, cô Tư, u Thắm. Xem nhật ký và livestream nông trại, đặt theo gói định kỳ hoặc gom đơn cùng hàng xóm, biết rau đang ở đâu, và được gợi ý nấu gì tối nay.</Text>

          <View style={{ gap: 10, marginTop: 20 }}>
            <PressableScale style={styles.ctaCard} onPress={() => router.push("/dang-nhap?role=customer")}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <View style={[styles.leading, { backgroundColor: colors.primaryContainer }]}>
                  <Icon name="shopping_basket" size={22} />
                </View>
                <View>
                  <Text style={styles.ctaEyebrow}>App khách hàng</Text>
                  <Text style={styles.ctaTitle}>Xanh Tận Tay</Text>
                </View>
              </View>
              <Text style={styles.muted}>Mua rau biết gốc. Đặt lẻ, đăng ký định kỳ hay gom đơn chung, theo dõi rau từ luống đến cửa.</Text>
              <Text style={[styles.ctaLink, { color: colors.primary }]}>Dùng thử tài khoản khách →</Text>
            </PressableScale>
            <PressableScale style={styles.ctaCard} onPress={() => router.push("/dang-nhap?role=farmer")}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <View style={[styles.leading, { backgroundColor: colors.tertiaryContainer }]}>
                  <Icon name="agriculture" size={22} />
                </View>
                <View>
                  <Text style={[styles.ctaEyebrow, { color: colors.tertiary }]}>App nông dân</Text>
                  <Text style={styles.ctaTitle}>Bạn của nhà nông</Text>
                </View>
              </View>
              <Text style={styles.muted}>Đăng bán theo đợt thu hoạch, cập nhật nhật ký bằng ảnh, nhận đơn và giao thẳng cho người ăn.</Text>
              <Text style={[styles.ctaLink, { color: colors.tertiary }]}>Dùng thử tài khoản nhà vườn →</Text>
            </PressableScale>
          </View>

          <View style={{ flexDirection: "row", gap: 24, marginTop: 22, flexWrap: "wrap" }}>
            {[
              { v: feed.stats.farms, l: "vườn đang bán" },
              { v: feed.stats.products, l: "loại rau củ" },
              { v: feed.stats.groups, l: "nhóm gom đơn mở" },
            ].map((s) => (
              <View key={s.l}>
                <Text style={styles.statV}>{s.v}</Text>
                <Text style={styles.statL}>{s.l}</Text>
              </View>
            ))}
          </View>
        </View>
      </AnimInScale>

      <View>
        <Text style={styles.centerEyebrow}>Cho người mua</Text>
        <Text style={styles.centerTitle}>Bốn điều Xanh Tận Tay làm khác</Text>
        <View style={{ gap: 12, marginTop: 16 }}>
          {PILLARS.map((p, i) => {
            const t = tone()[PILLAR_TONES[i % PILLAR_TONES.length]];
            return (
              <AnimIn key={p.eyebrow} index={i}>
                <View style={[styles.pillar, { backgroundColor: t.bg }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <View style={styles.pillarIcon}>
                      <Icon name={p.icon} size={22} filled color={t.fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pillarEyebrow, { color: t.fg }]}>{p.eyebrow}</Text>
                      <Text style={[styles.pillarTitle, { color: t.fg }]}>{p.title}</Text>
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    {p.items.map((it) => {
                      const key = `${p.eyebrow}-${it.t}`;
                      const open = openTip === key;
                      return (
                        <PressableScale key={it.t} scaleTo={0.985} style={styles.tintTile} onPress={() => setOpenTip(open ? null : key)}>
                          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                            <Icon name={it.icon} size={18} filled color={t.fg} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.tileTitle, { color: t.fg }]}>{it.t}</Text>
                              {it.d ? <Text style={[styles.tileDesc, { color: t.fg }]}>{it.d}</Text> : null}
                              {open && (
                                <AnimIn>
                                  <Text style={[styles.tileMore, { color: t.fg }]}>{it.more}</Text>
                                </AnimIn>
                              )}
                            </View>
                            <Text style={{ color: t.fg, opacity: 0.7 }}>{open ? "▴" : "▾"}</Text>
                          </View>
                        </PressableScale>
                      );
                    })}
                  </View>
                </View>
              </AnimIn>
            );
          })}
        </View>
      </View>

      <View style={styles.farmerSection}>
        <Text style={[styles.centerEyebrow, { color: colors.tertiary, textAlign: "left" }]}>Cho nhà vườn · App nông dân</Text>
        <Text style={[styles.centerTitle, { textAlign: "left" }]}>Bạn trồng, chúng tôi nối bạn với người ăn</Text>
        <Text style={[styles.muted, { marginTop: 6 }]}>Giao diện cực kỳ đơn giản, thao tác bằng ảnh và sắp tới bằng giọng nói, dành cho người chưa quen công nghệ.</Text>
        <Button label="Xem trang quản lý vườn" icon="agriculture" variant="tertiary" onPress={() => router.push("/dang-nhap?role=farmer")} style={{ alignSelf: "flex-start", marginTop: 12 }} />
        <View style={{ gap: 10, marginTop: 16 }}>
          {FARMER_POINTS.map((p, i) => {
            const open = openTip === p.t;
            return (
              <AnimIn key={p.t} index={i}>
                <PressableScale scaleTo={0.985} style={[styles.farmerCard, elevation[1]]} onPress={() => setOpenTip(open ? null : p.t)}>
                  <View style={[styles.leading, { backgroundColor: colors.tertiaryContainer }]}>
                    <Icon name={p.icon} size={20} filled color={colors.onTertiaryContainer} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.farmerT}>{p.t}</Text>
                    <Text style={styles.muted}>{p.d}</Text>
                    {open && (
                      <AnimIn>
                        <Text style={[styles.muted, { marginTop: 6, color: colors.onSurface }]}>{p.more}</Text>
                      </AnimIn>
                    )}
                  </View>
                </PressableScale>
              </AnimIn>
            );
          })}
        </View>
        <Text style={[styles.pillarEyebrow, { color: colors.onSurfaceVariant, marginTop: 22, marginBottom: 10 }]}>MỘT NGÀY CỦA NHÀ VƯỜN</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} decelerationRate="fast" snapToInterval={stepW + 10}>
          {DAY_STEPS.map((x, i) => (
            <View key={x.t} style={[styles.stepCard, elevation[1], { width: stepW }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View style={[styles.leading, { backgroundColor: colors.tertiaryContainer }]}>
                  <Icon name={x.icon} size={20} filled color={colors.onTertiaryContainer} />
                </View>
                <Chip label={x.time} small />
              </View>
              <Text style={[styles.pillarEyebrow, { color: colors.primary, fontSize: 10 }]}>BƯỚC {i + 1}</Text>
              <Text style={styles.farmerT}>{x.t}</Text>
              <Text style={styles.muted}>{x.d}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View>
        <Text style={styles.centerEyebrow}>Chi phí minh bạch</Text>
        <Text style={styles.centerTitle}>Ai trả gì, nói rõ từ đầu</Text>
        <Text style={[styles.muted, { textAlign: "center", marginTop: 6 }]}>Không có phí ẩn. Nhà vườn giữ trọn giá bán sau một khoản phí giao dịch nhỏ; người mua chỉ trả phần vận chuyển, và gom đơn là cách để không phải trả.</Text>
        <View style={{ gap: 10, marginTop: 16 }}>
          {FEES.map((f, i) => (
            <AnimIn key={f.t} index={i}>
              <View style={styles.feeCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <View style={styles.leading}>
                    <Icon name={f.icon} size={20} filled color={colors.onPrimaryContainer} />
                  </View>
                  <Chip label={f.who} small />
                </View>
                <Text style={styles.farmerT}>{f.t}</Text>
                <Text style={styles.muted}>{f.d}</Text>
              </View>
            </AnimIn>
          ))}
        </View>
      </View>

      {feed.farms.length > 0 && (
        <View>
          <SectionHead icon="potted_plant" title="Những vườn đang bán" action="Xem tất cả" onAction={() => router.push("/tabs/farms")} />
          <View style={{ gap: 12 }}>
            {feed.farms.slice(0, 3).map((farm, i) => (
              <AnimIn key={farm.id} index={i}>
                <PressableScale style={[styles.farmCard, elevation[1]]} onPress={() => router.push(`/farms/${farm.id}`)}>
                  <View style={[styles.farmMedia, { height: 150 }]}>
                    {farm.cover_url ? <Image source={{ uri: farm.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primaryContainer }]} />}
                  </View>
                  <View style={{ padding: 14 }}>
                    <Text style={styles.farmName}>{farm.name}</Text>
                    <Text style={styles.muted}><Icon name="location_on" size={12} filled color={colors.onSurfaceVariant} /> {farm.location}</Text>
                  </View>
                </PressableScale>
              </AnimIn>
            ))}
          </View>
        </View>
      )}

      <AnimIn>
        <View style={styles.finalCta}>
          <HeroBlob size={260} right={-120} top={80} color="rgba(255,255,255,.12)" />
          <Text style={styles.finalTitle}>Thử cả hai đầu, không cần đăng ký</Text>
          <Text style={styles.finalBody}>Tài khoản khách có sẵn đơn hàng, gói định kỳ và nhóm gom đơn. Tài khoản nhà vườn có đơn chờ hái và nhật ký để bạn đăng thử.</Text>
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

const makeStyles = (colors: Colors) => StyleSheet.create({
  error: { color: colors.error },
  muted: {  ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },
  chevron: { fontSize: 22, color: colors.onSurfaceVariant },
  leading: { width: 44, height: 44, borderRadius: shape.md, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },

  hero: { backgroundColor: colors.primaryContainer, borderRadius: shape.xlIncreased, padding: 22, overflow: "hidden" },
  eyebrow: { ...type.labelLarge, color: colors.primary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  heroTitle: { ...type.headlineSmall, color: colors.onPrimaryContainer, fontSize: 26, lineHeight: 32, marginBottom: 10 },
  heroBody: { ...type.bodyLarge, color: colors.onSecondaryContainer, fontSize: 15, lineHeight: 22 },
  heroChip: { alignSelf: "flex-start", backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.full, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 14 },
  heroChipText: { ...type.labelLarge, color: colors.primary, fontSize: 12 },
  statV: { ...type.headlineSmall, color: colors.onPrimaryContainer, fontSize: 24 },
  statL: { ...type.bodyMedium, color: colors.onSecondaryContainer, fontSize: 12 },

  ctaCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 18 },
  ctaEyebrow: { ...type.labelLarge, color: colors.primary, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 },
  ctaTitle: { ...type.titleLarge, color: colors.onSurface, fontSize: 18 },
  ctaLink: { ...type.labelLarge, marginTop: 10, fontSize: 13 },

  feature: { flexDirection: "row", alignItems: "flex-start", gap: 14, borderRadius: shape.xl, padding: 18 },
  featureTitle: { ...type.titleMedium, fontSize: 15 },
  featureText: { ...type.bodyMedium, fontSize: 13, opacity: 0.85 },

  farmCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, overflow: "hidden" },
  farmMedia: { height: 160, position: "relative", backgroundColor: colors.surfaceContainerHigh },
  farmLocChip: { position: "absolute", left: 12, bottom: 12, backgroundColor: "rgba(0,0,0,.55)", borderRadius: shape.full, paddingVertical: 4, paddingHorizontal: 10 },
  farmLocText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  farmName: {  ...type.titleMedium, color: colors.onSurface, fontSize: 16, marginBottom: 2 },
  farmDesc: {  ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },

  diaryItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 14 },
  diaryFarm: { ...type.labelLarge, color: colors.primary, fontSize: 12, marginBottom: 3 },
  diaryContent: {  ...type.bodyMedium, color: colors.onSurface, fontSize: 14, lineHeight: 20 },
  diaryMeta: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 6 },

  groupCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 18 },
  groupTitle: {  ...type.titleMedium, color: colors.onSurface, fontSize: 15 },

  centerEyebrow: { ...type.labelLarge, color: colors.primary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, textAlign: "center" },
  centerTitle: { ...type.headlineSmall, color: colors.onSurface, fontSize: 24, textAlign: "center", marginTop: 4 },
  pillar: { borderRadius: shape.xlIncreased, padding: 18 },
  pillarIcon: { width: 44, height: 44, borderRadius: shape.md, backgroundColor: colors.tintOverlayStrong, alignItems: "center", justifyContent: "center" },
  pillarEyebrow: { ...type.labelLarge, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, opacity: 0.8 },
  pillarTitle: { ...type.titleMedium, fontSize: 16 },
  tintTile: { backgroundColor: colors.tintOverlay, borderRadius: shape.md, padding: 12 },
  tileTitle: { ...type.titleMedium, fontSize: 14 },
  tileDesc: { ...type.bodyMedium, fontSize: 12, opacity: 0.85, marginTop: 2 },
  tileMore: { ...type.bodyMedium, fontSize: 12, marginTop: 8, lineHeight: 18 },

  farmerSection: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xxl, padding: 20 },
  farmerCard: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 16 },
  farmerT: { ...type.titleMedium, color: colors.onSurface, fontSize: 15, marginBottom: 2 },
  stepCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 16 },
  feeCard: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: shape.xl, padding: 16 },

  finalCta: { backgroundColor: colors.primary, borderRadius: shape.xxl, padding: 26, alignItems: "center", overflow: "hidden" },
  finalTitle: { ...type.headlineSmall, color: colors.onPrimary, fontSize: 22, textAlign: "center" },
  finalBody: { ...type.bodyMedium, color: colors.onPrimary, opacity: 0.85, textAlign: "center", marginTop: 8 },
  finalBtn: { borderRadius: shape.full, paddingVertical: 13, paddingHorizontal: 20 },
  finalBtnText: { ...type.labelLarge, fontSize: 14 },
});
