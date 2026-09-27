import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions, ScrollView } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import type { FarmDiaryEntry } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, elevation, emojiFont, useStyles } from "../../constants/theme";
import { formatDateTime, timeAgo } from "../../constants/format";
import { AnimInScale, PressableScale } from "../../components/motion";
import { Avatar, Button, Chip } from "../../components/ui";
import { MediaGallery } from "../../components/MediaGallery";
import type { Colors } from "../../constants/theme";
import { PageLoader } from "../../components/Loader";
import { Icon } from "../../components/Icon";

interface DiaryPayload {
  farm: { id: string; name: string; slug: string; location: string; cover_url: string | null; farmerName: string | null; farmerAvatar: string | null };
  posts: FarmDiaryEntry[];
}

/** Mirrors apps/web/src/components/farm/DiaryPostPager.tsx — swipe between a farm's posts, oldest → newest. */
export default function NhatKyScreen() {
  const styles = useStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<DiaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<FarmDiaryEntry>>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/diary/${id}`)
      .then((d: DiaryPayload) => {
        setData(d);
        setIndex(Math.max(0, d.posts.findIndex((p) => p.id === id)));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được bài nhật ký"));
  }, [id]);

  const go = (i: number) => {
    if (!data) return;
    const next = Math.max(0, Math.min(data.posts.length - 1, i));
    setIndex(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{error}</Text>
      </View>
    );
  }
  if (!data) {
    return (
      <PageLoader />
    );
  }

  const { farm, posts } = data;
  const current = posts[index];
  const pageW = width;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: farm.name }} />
      <View style={styles.head}>
        <Text style={styles.muted}>
          Bài {index + 1} / {posts.length} · {index === posts.length - 1 ? "mới nhất" : index === 0 ? "cũ nhất" : timeAgo(current.created_at)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <TouchableOpacity style={[styles.navBtn, index === 0 && { opacity: 0.4 }]} disabled={index === 0} onPress={() => go(index - 1)}>
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          {posts.length <= 12 && (
            <View style={{ flexDirection: "row", gap: 4 }}>
              {posts.map((p, i) => <View key={p.id} style={[styles.dot, i === index && styles.dotActive]} />)}
            </View>
          )}
          <TouchableOpacity style={[styles.navBtn, index === posts.length - 1 && { opacity: 0.4 }]} disabled={index === posts.length - 1} onPress={() => go(index + 1)}>
            <Text style={styles.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={posts}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
        keyExtractor={(p) => p.id}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / pageW))}
        renderItem={({ item: d, index: i }) => {
          const paragraphs = d.content.split(/\n{2,}|\n/).map((x) => x.trim()).filter(Boolean);
          const near = Math.abs(i - index) <= 1; // only mount media for neighbours
          return (
            <ScrollView style={{ width: pageW }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
              <AnimInScale>
                <View style={[styles.card, elevation[2]]}>
                  <View style={styles.cardHead}>
                    <PressableScale onPress={() => router.push(`/farms/${farm.id}`)}>
                      <Avatar name={farm.farmerName} src={farm.farmerAvatar} size={44} />
                    </PressableScale>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <TouchableOpacity onPress={() => router.push(`/farms/${farm.id}`)}>
                        <Text style={styles.farmName}>{farm.name}</Text>
                      </TouchableOpacity>
                      <Text style={styles.muted} numberOfLines={1}>
                        {farm.farmerName ? `${farm.farmerName} · ` : ""}<Icon name="location_on" size={12} filled color={colors.onSurfaceVariant} /> {farm.location}
                      </Text>
                    </View>
                    <Chip icon="schedule" label={`${timeAgo(d.created_at)}`} small />
                  </View>
                  <View style={{ paddingHorizontal: 18, paddingBottom: 14, gap: 8 }}>
                    {paragraphs.map((p, k) => (
                      <Text key={k} style={styles.para}>{p}</Text>
                    ))}
                  </View>
                  {d.media_urls.length > 0 && near && (
                    <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                      <MediaGallery urls={d.media_urls} layout="post" tag={farm.name} caption={formatDateTime(d.created_at)} />
                    </View>
                  )}
                  <View style={styles.cardFoot}>
                    <Text style={[styles.muted, { flex: 1 }]}>
                      {formatDateTime(d.created_at)}
                      {d.media_urls.length ? ` · ${d.media_urls.length} ảnh/video` : ""}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
                    <Button label="Đặt rau từ vườn này" icon="shopping_basket" small onPress={() => router.push(`/farms/${farm.id}`)} style={{ alignSelf: "flex-start" }} />
                  </View>
                </View>
              </AnimInScale>
            </ScrollView>
          );
        }}
      />
      <Text style={[styles.muted, { textAlign: "center", paddingBottom: 12 }]}>Vuốt hoặc dùng mũi tên: trái là bài cũ hơn, phải là bài mới hơn</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { ...emojiFont,  ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondaryContainer, alignItems: "center", justifyContent: "center" },
  navBtnText: { fontSize: 22, color: colors.onSecondaryContainer, lineHeight: 24, fontWeight: "700" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.outlineVariant },
  dotActive: { backgroundColor: colors.primary, width: 16 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xlIncreased, overflow: "hidden" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, paddingBottom: 12 },
  farmName: { ...emojiFont,  ...type.titleMedium, color: colors.onSurface, fontSize: 16 },
  para: { ...emojiFont,  ...type.bodyLarge, color: colors.onSurface, fontSize: 16, lineHeight: 26 },
  cardFoot: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 8 },
});
