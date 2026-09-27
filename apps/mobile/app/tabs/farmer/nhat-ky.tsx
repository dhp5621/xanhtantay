import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import type { FarmDiaryEntry } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../../constants/api";
import { colors, shape, type, elevation } from "../../../constants/theme";
import { pickMedia, uploadMedia, MAX_FILES, VIDEO_MAX_SECONDS, fmtMB, type PickedMedia } from "../../../constants/media";
import { formatDateTime, timeAgo } from "../../../constants/format";
import { AnimIn, AnimInScale, PressableScale } from "../../../components/motion";
import { Button, Chip, PageHeader } from "../../../components/ui";
import { MediaGallery } from "../../../components/MediaGallery";
import { Icon } from "../../../components/Icon";
import { useLiveRefresh } from "../../../hooks/useLive";

const SUGGESTIONS = [
  { icon: "eco", text: "Hôm nay thu hoạch được lứa rau xanh mướt." },
  { icon: "grass", text: "Gieo hạt đợt mới, khoảng 3 tuần nữa có hàng." },
  { icon: "water_drop", text: "Tưới nước buổi sáng, thời tiết thuận lợi cho rau lớn." },
  { icon: "local_florist", text: "Cây đang ra hoa, sắp có trái ngon cho các bạn." },
];

/** Mirrors apps/web/src/components/farmer/DiaryComposer.tsx — text + up to 4 photos/videos, uploaded via /api/upload. */
export default function NhatKyScreen() {
  const [farm, setFarm] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [recent, setRecent] = useState<FarmDiaryEntry[]>([]);
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const f = await apiFetch("/farms/mine");
      setFarm(f);
      setRecent(await apiFetch(`/farms/${f.id}/diary`).catch(() => []));
    } catch {
      setFarm(null);
    }
  }, []);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const add = async (source: "camera" | "library", allowVideo: boolean) => {
    if (media.length >= MAX_FILES) {
      Alert.alert(`Tối đa ${MAX_FILES} tệp mỗi bài`);
      return;
    }
    setProcessing("Đang nén ảnh…");
    try {
      const picked = await pickMedia({ source, allowVideo, max: MAX_FILES - media.length });
      setMedia((m) => [...m, ...picked].slice(0, MAX_FILES));
    } catch (e) {
      Alert.alert("Không lấy được ảnh", e instanceof Error ? e.message : undefined);
    } finally {
      setProcessing(null);
    }
  };

  const submit = async () => {
    if (!content.trim() || !farm) return;
    setSubmitting(true);
    try {
      const media_urls: string[] = [];
      for (const [i, m] of media.entries()) {
        setProcessing(`Đang tải ${m.kind === "video" ? "video" : "ảnh"} ${i + 1}/${media.length}…`);
        try {
          media_urls.push(await uploadMedia(m));
        } catch (e) {
          Alert.alert(`Không tải được ${m.kind === "video" ? "video" : "ảnh"}`, e instanceof ApiError ? e.message : "lỗi");
        }
      }
      setProcessing(null);
      const entry = await apiFetch(`/farms/${farm.id}/diary`, { method: "POST", body: JSON.stringify({ content: content.trim(), media_urls }) });
      setRecent((r) => [entry, ...r]);
      setContent("");
      setMedia([]);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      Alert.alert("Không đăng được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setProcessing(null);
      setSubmitting(false);
    }
  };

  if (farm === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (farm === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Tài khoản này chưa có vườn nên chưa thể đăng nhật ký.</Text>
      </View>
    );
  }

  const full = media.length >= MAX_FILES;
  const totalSize = media.reduce((s, m) => s + (m.size ?? 0), 0);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        <PageHeader icon="photo_camera" eyebrow={farm.name} title="Nhật ký vườn" subtitle="Hôm nay ở vườn có gì hay? Chia sẻ cùng khách hàng nhé." />

        <AnimIn>
          <TextInput style={styles.textarea} multiline maxLength={1000} placeholder="Hôm nay ở vườn có gì hay? Chia sẻ cùng khách hàng nhé…" placeholderTextColor={colors.onSurfaceVariant} value={content} onChangeText={setContent} />
          <Text style={styles.counter}>{content.length}/1000</Text>
        </AnimIn>

        <AnimIn delay={60}>
          <Text style={styles.label}>Gợi ý nhanh</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SUGGESTIONS.map((s) => <Chip key={s.text} label={`${s.icon} ${s.text}`} small onPress={() => setContent(s.text)} style={{ maxWidth: "100%" }} />)}
          </View>
        </AnimIn>

        <AnimIn delay={120}>
          <Text style={styles.label}>Ảnh / video (tối đa {MAX_FILES}, video ≤ {VIDEO_MAX_SECONDS}s)</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { icon: "photo_camera", label: "Chụp ảnh", hint: "Camera", act: () => add("camera", false) },
              { icon: "videocam", label: "Quay video", hint: `Tối đa ${VIDEO_MAX_SECONDS}s`, act: () => add("camera", true) },
              { icon: "image", label: "Chọn từ máy", hint: "Ảnh hoặc video", act: () => add("library", true) },
            ].map((b) => (
              <PressableScale key={b.label} disabled={full || !!processing} style={[styles.pickBtn, (full || !!processing) && { opacity: 0.5 }]} onPress={b.act}>
                <Icon name={b.icon} size={26} />
                <Text style={styles.pickLabel}>{b.label}</Text>
                <Text style={styles.pickHint}>{b.hint}</Text>
              </PressableScale>
            ))}
          </View>

          {processing && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.body}>{processing}</Text>
            </View>
          )}

          {media.length > 0 && (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {media.map((m, i) => (
                  <AnimInScale key={m.uri} index={i}>
                    <View style={styles.thumbWrap}>
                      <Image source={{ uri: m.uri }} style={styles.thumb} contentFit="cover" transition={200} />
                      {m.kind === "video" && (
                        <View style={styles.playBadge}>
                          <Text style={{ color: "#fff", fontSize: 12 }}>▶ video</Text>
                        </View>
                      )}
                      <PressableScale haptic style={styles.removeBtn} onPress={() => setMedia((ms) => ms.filter((_, j) => j !== i))}>
                        <Text style={{ color: colors.onError, fontWeight: "800", fontSize: 12 }}>✕</Text>
                      </PressableScale>
                    </View>
                  </AnimInScale>
                ))}
              </View>
              {totalSize > 0 && <Text style={[styles.body, { marginTop: 6 }]}>Sẽ tải lên {fmtMB(totalSize)}</Text>}
            </>
          )}
        </AnimIn>

        {done && (
          <AnimInScale>
            <View style={styles.doneBanner}>
              <Text style={styles.doneBannerText}><Icon name="check_circle" size={16} filled color={colors.onPrimaryContainer} /> Đã đăng nhật ký. Khách hàng sẽ thấy ngay trên trang vườn.</Text>
            </View>
          </AnimInScale>
        )}

        <AnimIn delay={180}>
          <Button label={submitting ? "Đang đăng…" : `Đăng lên ${farm.name}`} icon="send" onPress={submit} loading={submitting} disabled={!!processing || !content.trim()} />
        </AnimIn>

        {recent.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionTitle}>Bài gần đây</Text>
            <View style={{ gap: 10 }}>
              {recent.slice(0, 5).map((d, i) => (
                <AnimIn key={d.id} index={i}>
                  <View style={[styles.recentCard, elevation[1]]}>
                    {d.media_urls.length > 0 && <MediaGallery urls={d.media_urls} layout="thumb" size={72} tag={farm.name} />}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.recentText} numberOfLines={3}>{d.content}</Text>
                      <Text style={styles.body}><Icon name="schedule" size={12} color={colors.onSurfaceVariant} /> {timeAgo(d.created_at)} · {formatDateTime(d.created_at)}</Text>
                    </View>
                  </View>
                </AnimIn>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  body: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  textarea: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 14, color: colors.onSurface, minHeight: 130, textAlignVertical: "top", fontSize: 15, borderWidth: 1, borderColor: colors.outlineVariant },
  counter: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 11, textAlign: "right", marginTop: 4 },
  label: { ...type.labelLarge, color: colors.onSurface, marginBottom: 8, fontSize: 13 },
  pickBtn: { flex: 1, minHeight: 96, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: shape.xl, borderWidth: 2, borderStyle: "dashed", borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainer, padding: 8 },
  pickLabel: { ...type.titleMedium, color: colors.onSurface, fontSize: 13 },
  pickHint: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 10 },
  thumbWrap: { width: 96, height: 96, borderRadius: shape.md, overflow: "visible", position: "relative" },
  thumb: { width: 96, height: 96, borderRadius: shape.md, backgroundColor: colors.surfaceContainerHigh },
  playBadge: { position: "absolute", left: 4, bottom: 4, backgroundColor: "rgba(0,0,0,.6)", borderRadius: shape.full, paddingVertical: 2, paddingHorizontal: 6 },
  removeBtn: { position: "absolute", top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.error, alignItems: "center", justifyContent: "center" },
  doneBanner: { backgroundColor: colors.primaryContainer, borderRadius: shape.md, padding: 12 },
  doneBannerText: { color: colors.onPrimaryContainer, fontWeight: "700" },
  sectionTitle: { ...type.titleLarge, color: colors.onSurface, fontSize: 18, marginBottom: 10 },
  recentCard: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 12 },
  recentText: { ...type.bodyMedium, color: colors.onSurface, fontSize: 14, marginBottom: 4 },
});
