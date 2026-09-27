import { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, FlatList, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { SmartImage } from "./SmartImage";
import { colors, shape, useStyles } from "../constants/theme";
import { PressableScale } from "./motion";
import type { Colors } from "../constants/theme";
import { Icon } from "./Icon";

export const isVideoUrl = (u: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);

function Thumb({ url, style, onPress }: { url: string; style: StyleProp<ViewStyle>; onPress?: () => void }) {
  const styles = useStyles(makeStyles);
  const video = isVideoUrl(url);
  const body = (
    <View style={[styles.thumb, style]}>
      {video ? <InlineVideo url={url} muted /> : <SmartImage uri={url} style={StyleSheet.absoluteFill} />}
      {video && (
        <View style={styles.play}>
          <Icon name="play_arrow" size={24} filled color="#fff" />
        </View>
      )}
    </View>
  );
  return onPress ? <PressableScale onPress={onPress} scaleTo={0.97} style={{ flex: 1 }}>{body}</PressableScale> : <View style={{ flex: 1 }}>{body}</View>;
}

export function InlineVideo({ url, muted = false, controls = false, style }: { url: string; muted?: boolean; controls?: boolean; style?: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = muted;
    if (muted) p.play();
  });
  return <VideoView player={player} style={[StyleSheet.absoluteFill, style]} contentFit={controls ? "contain" : "cover"} nativeControls={controls} />;
}

/**
 * Mirrors apps/web/src/components/ui/MediaGallery.tsx — a single thumbnail (with a media count) or a
 * "post" layout (1 = full width, 2 = halves, 3+ = big + strip). Tapping opens a full-screen swipeable viewer.
 */
export function MediaGallery({ urls, layout = "post", size = 96, tag, caption }: { urls: string[]; layout?: "post" | "thumb"; size?: number; tag?: string; caption?: string }) {
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState<number | null>(null);
  if (!urls.length) return null;

  let grid;
  if (layout === "thumb") {
    grid = (
      <View style={{ width: size, height: size, position: "relative" }}>
        <Thumb url={urls[0]} style={{ borderRadius: shape.md }} onPress={() => setOpen(0)} />
        {urls.length > 1 && (
          <View style={styles.countChip} pointerEvents="none">
            <Icon name="photo_library" size={11} filled color="#fff" />
            <Text style={styles.countChipText}>{urls.length}</Text>
          </View>
        )}
      </View>
    );
  } else if (urls.length === 1) {
    grid = <Thumb url={urls[0]} style={{ aspectRatio: 4 / 3, borderRadius: shape.lg }} onPress={() => setOpen(0)} />;
  } else if (urls.length === 2) {
    grid = (
      <View style={{ flexDirection: "row", gap: 6 }}>
        {urls.map((u, i) => <Thumb key={u} url={u} style={{ aspectRatio: 1, borderRadius: shape.lg }} onPress={() => setOpen(i)} />)}
      </View>
    );
  } else {
    grid = (
      <View style={{ gap: 6 }}>
        <Thumb url={urls[0]} style={{ aspectRatio: 16 / 10, borderRadius: shape.lg }} onPress={() => setOpen(0)} />
        <View style={{ flexDirection: "row", gap: 6 }}>
          {urls.slice(1, 4).map((u, i) => (
            <View key={u} style={{ flex: 1, position: "relative" }}>
              <Thumb url={u} style={{ aspectRatio: 1, borderRadius: shape.md }} onPress={() => setOpen(i + 1)} />
              {i === 2 && urls.length > 4 && (
                <View style={styles.moreOverlay} pointerEvents="none">
                  <Text style={styles.moreText}>+{urls.length - 4}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <>
      {grid}
      <MediaViewer urls={urls} index={open} onClose={() => setOpen(null)} tag={tag} caption={caption} />
    </>
  );
}

/** Full-screen viewer — dark backdrop, horizontal paging, position pill, tag like the web's photo viewer. */
export function MediaViewer({ urls, index, onClose, tag, caption }: { urls: string[]; index: number | null; onClose: () => void; tag?: string; caption?: string }) {
  const styles = useStyles(makeStyles);
  const { width, height } = useWindowDimensions();
  const [current, setCurrent] = useState(index ?? 0);
  if (index === null) return null;
  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose} onShow={() => setCurrent(index)}>
      <View style={styles.viewer}>
        <FlatList
          data={urls}
          horizontal
          pagingEnabled
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(u) => u}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <Pressable onPress={onClose} style={{ width, height, alignItems: "center", justifyContent: "center" }}>
              {isVideoUrl(item) ? (
                <View style={{ width, height: height * 0.7 }}>
                  <InlineVideo url={item} controls />
                </View>
              ) : (
                <SmartImage uri={item} style={{ width, height: height * 0.8, backgroundColor: "transparent" }} contentFit="contain" loaderSize={44} />
              )}
            </Pressable>
          )}
        />
        <View style={styles.viewerTop} pointerEvents="box-none">
          {tag ? (
            <View style={styles.viewerTag}>
              <Icon name="eco" size={14} filled color="#fff" />
              <Text style={styles.viewerTagText}>{tag}</Text>
            </View>
          ) : <View />}
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Icon name="close" size={22} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.viewerBottom} pointerEvents="none">
          {caption ? <Text style={styles.viewerCaption}>{caption}</Text> : null}
          {urls.length > 1 && (
            <View style={styles.viewerPill}>
              <Text style={styles.viewerPillText}>{current + 1} / {urls.length}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  thumb: { flex: 1, overflow: "hidden", backgroundColor: colors.surfaceContainerHigh, position: "relative" },
  play: { position: "absolute", left: "50%", top: "50%", marginLeft: -20, marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,.55)", alignItems: "center", justifyContent: "center" },
  countChip: { position: "absolute", right: 4, bottom: 4, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,.6)", borderRadius: shape.full, paddingVertical: 2, paddingHorizontal: 6 },
  countChipText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  moreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,.45)", borderRadius: shape.md, alignItems: "center", justifyContent: "center" },
  moreText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  viewer: { flex: 1, backgroundColor: "rgba(8,12,9,.96)" },
  viewerTop: { position: "absolute", top: 48, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  viewerTag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,.14)", borderRadius: shape.full, paddingVertical: 6, paddingHorizontal: 12 },
  viewerTagText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.14)", alignItems: "center", justifyContent: "center" },
  viewerBottom: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center", gap: 8 },
  viewerCaption: { color: "rgba(255,255,255,.85)", fontSize: 13 },
  viewerPill: { backgroundColor: "rgba(255,255,255,.14)", borderRadius: shape.full, paddingVertical: 6, paddingHorizontal: 12 },
  viewerPillText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
