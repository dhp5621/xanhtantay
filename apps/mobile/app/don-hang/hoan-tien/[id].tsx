import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { apiFetch, ApiError } from "../../../constants/api";
import { colors, shape, type, useStyles, type Colors } from "../../../constants/theme";
import {
  REFUND_IMAGE_MAX_BYTES,
  REFUND_MAX_WORDS,
  REFUND_METHODS,
  REFUND_MIN_WORDS,
  REFUND_PHOTOS,
  REFUND_PHOTO_SLOTS,
  REFUND_REASONS,
  REFUND_VIDEO_MAX_BYTES,
  REFUND_VIDEO_SECONDS,
  countWords,
  evidenceRequired,
} from "../../../constants/commerce";
import { fmtDuration, fmtMB, pickMedia, uploadMedia, type PickedMedia } from "../../../constants/media";
import { formatDateTime } from "../../../constants/format";
import type { RefundMethod, RefundReason, RefundState } from "../../../constants/types";
import { AnimatedProgress, PressableScale } from "../../../components/motion";
import { Button, EmptyState } from "../../../components/ui";
import { KeyboardScroll } from "../../../components/keyboard";
import { InlineVideo } from "../../../components/MediaGallery";
import { Loader, PageLoader } from "../../../components/Loader";
import { Icon } from "../../../components/Icon";
import { useAddress } from "../../../hooks/useAddress";

/** A picked file; `url` is set once it has been uploaded, so a retry does not send it again. */
type Evidence = PickedMedia & { url?: string };
/** What is being picked or compressed right now: a photo slot or the video. */
type Working = { slot: number | "video"; text: string };

const NO_PHOTOS: (Evidence | null)[] = REFUND_PHOTO_SLOTS.map(() => null);

/** The return / refund request form of a delivered order. Files are uploaded when the customer sends. */
export default function RefundRequestScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pronoun } = useAddress();
  const [state, setState] = useState<RefundState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reason, setReason] = useState<RefundReason | null>(null);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<(Evidence | null)[]>(NO_PHOTOS);
  const [video, setVideo] = useState<Evidence | null>(null);
  const [method, setMethod] = useState<RefundMethod | null>(null);
  const [working, setWorking] = useState<Working | null>(null);
  const [sending, setSending] = useState<{ text: string; progress: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    try {
      setState(await apiFetch(`/orders/${id}/refund`));
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Mạng đang yếu, xin thử lại giúp ạ.");
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const backToOrder = () => (router.canGoBack() ? router.back() : router.replace(`/don-hang/${id}` as never));

  const busy = !!working || !!sending;
  const needEvidence = evidenceRequired(reason);
  const words = countWords(description);
  const photoCount = photos.filter(Boolean).length;

  // What still keeps the request from being sent, in the order of the form.
  const missing: string[] = [];
  if (!reason) missing.push("Chưa chọn lý do");
  if (words < REFUND_MIN_WORDS) missing.push(`Mô tả cần ít nhất ${REFUND_MIN_WORDS} từ`);
  else if (words > REFUND_MAX_WORDS) missing.push(`Mô tả đang dài ${words} từ, xin rút gọn còn ${REFUND_MAX_WORDS} từ giúp ạ`);
  if (needEvidence) {
    const parts = [photoCount < REFUND_PHOTOS ? `${REFUND_PHOTOS - photoCount} ảnh` : null, video ? null : "1 video"].filter(Boolean);
    if (parts.length) missing.push(`Còn thiếu ${parts.join(" và ")}`);
  }
  if (!method) missing.push("Chưa chọn cách xử lý mong muốn");
  const valid = missing.length === 0;

  const pick = async (slot: number | "video", source: "camera" | "library") => {
    if (busy) return;
    setError(null);
    const isVideo = slot === "video";
    setWorking({ slot, text: isVideo ? "Đang lấy video…" : "Đang lấy ảnh…" });
    try {
      const [file] = await pickMedia({
        source,
        kind: isVideo ? "video" : "image",
        videoMaxSeconds: REFUND_VIDEO_SECONDS,
        onStatus: (text) => setWorking({ slot, text }),
      });
      if (!file) return;
      if (isVideo) {
        if (file.kind !== "video") throw new Error("Tệp này không phải video, xin chọn lại giúp ạ.");
        if (file.size && file.size > REFUND_VIDEO_MAX_BYTES) {
          throw new Error(`Video này nặng ${fmtMB(file.size)}, máy chủ chỉ nhận đến ${fmtMB(REFUND_VIDEO_MAX_BYTES)}. Xin quay ngắn hơn hoặc ở độ phân giải thấp hơn (720p) giúp ạ.`);
        }
        setVideo(file);
      } else {
        if (file.kind !== "image") throw new Error("Tệp này không phải ảnh, xin chọn lại giúp ạ.");
        if (file.size && file.size > REFUND_IMAGE_MAX_BYTES) throw new Error("Ảnh này nặng quá, xin chọn ảnh khác giúp ạ.");
        setPhotos((list) => list.map((p, i) => (i === slot ? file : p)));
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : isVideo ? "Không lấy được video này, xin thử lại giúp ạ." : "Không đọc được ảnh này, xin chọn ảnh khác giúp ạ.");
    } finally {
      setWorking(null);
    }
  };

  const submit = async () => {
    if (!valid || busy || !reason || !method || !id) return;
    setError(null);
    let step = "";
    try {
      // Upload what has not been uploaded yet; each url is kept on its file for a retry.
      const chosen = photos.map((p, i) => ({ p, i })).filter((x): x is { p: Evidence; i: number } => !!x.p);
      const urls: string[] = [];
      for (const [n, { p, i }] of chosen.entries()) {
        if (p.url) {
          urls.push(p.url);
          continue;
        }
        step = `ảnh ${n + 1}`;
        const text = `Đang tải ảnh ${n + 1}/${chosen.length}…`;
        setSending({ text, progress: 0 });
        const url = await uploadMedia(p, { purpose: "refund", onProgress: (f) => setSending({ text, progress: f }) });
        urls.push(url);
        setPhotos((list) => list.map((cur, j) => (j === i && cur?.uri === p.uri ? { ...cur, url } : cur)));
      }
      let video_url: string | null = video?.url ?? null;
      if (video && !video_url) {
        step = "video";
        const text = "Đang tải video…";
        setSending({ text, progress: 0 });
        const url = await uploadMedia(video, { purpose: "refund", onProgress: (f) => setSending({ text, progress: f }) });
        video_url = url;
        setVideo((cur) => (cur?.uri === video.uri ? { ...cur, url } : cur));
      }
      step = "";
      setSending({ text: "Đang gửi yêu cầu…", progress: null });
      await apiFetch(`/orders/${id}/refund`, { method: "POST", body: JSON.stringify({ reason, description: description.trim(), photos: urls, video_url, method }) });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      backToOrder();
    } catch (e) {
      // A TypeError is the network layer giving up; anything else carries its own words.
      const why = (e instanceof Error && !(e instanceof TypeError) && e.message ? e.message : "Mạng đang yếu").replace(/[.\s]+$/, "");
      setError(`${step ? `Chưa tải được ${step}` : "Chưa gửi được yêu cầu"}: ${why}. Ảnh và video đã chọn vẫn còn, xin bấm gửi lại giúp ạ.`);
      // Someone (or another device) already filed one: the order screen shows it.
      if (e instanceof ApiError && e.status === 409) load();
    } finally {
      setSending(null);
    }
  };

  if (!state && !loadError) return <PageLoader />;
  if (!state) {
    return (
      <View style={styles.center}>
        <EmptyState icon="wifi_off" title="Chưa tải được" description={loadError ?? undefined} action={<Button label="Thử lại" icon="refresh" onPress={load} />} />
      </View>
    );
  }
  if (state.request || !state.can_request) {
    return (
      <View style={styles.center}>
        <EmptyState
          icon={state.request ? "task_alt" : "info"}
          title={state.request ? "Đơn này đã có yêu cầu rồi ạ" : "Chưa gửi được yêu cầu"}
          description={state.request ? "Xin xem tình trạng xử lý ở trang đơn hàng." : (state.reason ?? undefined)}
          action={<Button label="Về đơn hàng" icon="arrow_back" onPress={backToOrder} />}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardScroll contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom, gap: 22 }}>
        {state.until ? <Text style={styles.muted}>Gửi được đến hết {formatDateTime(state.until)}</Text> : null}

        <View>
          <Text style={styles.label}>Lý do</Text>
          <View style={{ gap: 8 }}>
            {REFUND_REASONS.map((r) => (
              <Option key={r.value} icon={r.icon} label={r.label} selected={reason === r.value} disabled={busy} onPress={() => setReason(r.value)} />
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Mô tả chi tiết</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            editable={!sending}
            placeholder="Xin kể lại hộp rau gặp vấn đề gì, lúc nhận ra sao…"
            placeholderTextColor={colors.onSurfaceVariant}
          />
          <Text style={[styles.counter, words > REFUND_MAX_WORDS && { color: colors.error, fontWeight: "700" }]}>
            {words}/{REFUND_MAX_WORDS} từ
          </Text>
        </View>

        <View>
          <Text style={styles.label}>Hình ảnh / video bằng chứng</Text>
          <Text style={[styles.muted, { marginBottom: 12 }]}>
            {needEvidence
              ? `Cần đủ ${REFUND_PHOTOS} ảnh chụp các mặt của hộp và 1 video quay hộp, dài không quá ${REFUND_VIDEO_SECONDS} giây.`
              : `Chưa nhận được hàng thì không cần ảnh hay video ạ. Nếu có (ví dụ ảnh điểm nhận hàng), ${pronoun} gửi kèm được đến ${REFUND_PHOTOS} ảnh và 1 video.`}
          </Text>

          <View style={{ gap: 10 }}>
            {REFUND_PHOTO_SLOTS.map((name, i) => {
              const p = photos[i];
              const mine = working?.slot === i;
              return (
                <View key={name} style={styles.slot}>
                  <View style={styles.preview}>
                    {mine ? <Loader size={26} /> : p ? <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : <Icon name="photo_camera" size={28} color={colors.onSurfaceVariant} />}
                  </View>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={styles.slotHead}>
                      <Text style={styles.slotTitle}>
                        Ảnh {i + 1}: {name}
                      </Text>
                      {p && !busy ? <Remove label={`Bỏ ảnh ${name}`} onPress={() => setPhotos((list) => list.map((cur, j) => (j === i ? null : cur)))} /> : null}
                    </View>
                    {mine ? <Text style={styles.muted}>{working.text}</Text> : null}
                    <View style={styles.actions}>
                      <Button label={p ? "Chụp lại" : "Chụp"} icon="photo_camera" variant="tonal" small disabled={busy} onPress={() => pick(i, "camera")} />
                      <Button label="Chọn từ máy" icon="photo_library" variant="tonal" small disabled={busy} onPress={() => pick(i, "library")} />
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={[styles.slot, { flexDirection: "column" }]}>
              <View style={styles.slotHead}>
                <Text style={styles.slotTitle}>Video quay hộp rau (tối đa {REFUND_VIDEO_SECONDS} giây)</Text>
                {video && !busy ? <Remove label="Bỏ video" onPress={() => setVideo(null)} /> : null}
              </View>
              {working?.slot === "video" ? (
                <View style={styles.line}>
                  <Loader size={22} />
                  <Text style={styles.muted}>{working.text}</Text>
                </View>
              ) : video ? (
                <>
                  <View style={styles.video}>
                    <InlineVideo key={video.uri} url={video.uri} controls />
                  </View>
                  <View style={styles.line}>
                    <Icon name="videocam" size={18} color={colors.onSurfaceVariant} />
                    <Text style={styles.muted}>{[video.durationMs ? `Dài ${fmtDuration(video.durationMs)}` : "Không đọc được độ dài", video.size ? fmtMB(video.size) : null].filter(Boolean).join(" · ")}</Text>
                  </View>
                </>
              ) : null}
              <View style={styles.actions}>
                <Button label={video ? "Quay lại video" : "Quay video"} icon="videocam" variant="tonal" small disabled={busy} onPress={() => pick("video", "camera")} />
                <Button label="Chọn từ máy" icon="photo_library" variant="tonal" small disabled={busy} onPress={() => pick("video", "library")} />
              </View>
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.label}>Cách xử lý mong muốn</Text>
          <View style={{ gap: 8 }}>
            {REFUND_METHODS.map((m) => (
              <Option key={m.value} icon={m.icon} label={m.label} hint={m.hint} selected={method === m.value} disabled={busy} onPress={() => setMethod(m.value)} />
            ))}
          </View>
          <Text style={[styles.muted, { marginTop: 10 }]}>Chúng tôi sẽ xác minh rồi báo lại cho {pronoun}. Cách xử lý cuối cùng tuỳ theo tình trạng hộp rau.</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="error" size={22} color={colors.onErrorContainer} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          {sending ? (
            <View style={styles.sending}>
              <View style={styles.line}>
                <Loader size={22} />
                <Text style={styles.sendingText}>
                  {sending.text}
                  {sending.progress != null ? ` ${Math.round(sending.progress * 100)}%` : ""}
                </Text>
              </View>
              <AnimatedProgress value={sending.progress != null ? sending.progress * 100 : 100} wavy={sending.progress == null} />
            </View>
          ) : null}
          <Button label={sending ? "Đang gửi…" : "Gửi yêu cầu"} icon="send" onPress={submit} disabled={!valid || busy} style={{ alignSelf: "stretch", paddingVertical: 16 }} />
          {!sending
            ? missing.map((m) => (
                <View key={m} style={styles.line}>
                  <Icon name="info" size={16} color={colors.onSurfaceVariant} />
                  <Text style={[styles.muted, { flex: 1 }]}>{m}</Text>
                </View>
              ))
            : null}
        </View>
      </KeyboardScroll>
    </View>
  );
}

/** One choice of a pick-one list. */
function Option({ icon, label, hint, selected, disabled, onPress }: { icon: string; label: string; hint?: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  const fg = selected ? colors.onPrimaryContainer : colors.onSurface;
  return (
    <PressableScale haptic scaleTo={0.98} disabled={disabled} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected, disabled: !!disabled }} accessibilityLabel={label} style={[styles.option, selected && styles.optionOn]}>
      <Icon name={icon} size={22} color={fg} filled={selected} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionText, { color: fg }]}>{label}</Text>
        {hint ? <Text style={[styles.muted, selected && { color: colors.onPrimaryContainer }]}>{hint}</Text> : null}
      </View>
      <Icon name={selected ? "radio_button_checked" : "radio_button_unchecked"} size={22} color={selected ? colors.primary : colors.onSurfaceVariant} />
    </PressableScale>
  );
}

function Remove({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <PressableScale haptic onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={styles.remove}>
      <Icon name="delete" size={18} color={colors.error} />
      <Text style={styles.removeText}>Bỏ</Text>
    </PressableScale>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    center: { flex: 1, backgroundColor: c.surface, justifyContent: "center", padding: 16 },
    muted: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13 },
    label: { ...type.titleMedium, color: c.onSurface, fontSize: 17, marginBottom: 10 },
    option: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceContainerLow, borderRadius: shape.lg, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: "transparent" },
    optionOn: { backgroundColor: c.primaryContainer, borderColor: c.primary },
    optionText: { ...type.titleMedium, fontSize: 15 },
    input: { backgroundColor: c.surfaceContainer, borderRadius: shape.lg, padding: 14, color: c.onSurface, fontSize: 16, lineHeight: 23, minHeight: 140, borderWidth: 1, borderColor: c.outlineVariant },
    counter: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 12, textAlign: "right", marginTop: 6 },
    slot: { flexDirection: "row", gap: 12, backgroundColor: c.surfaceContainerLow, borderRadius: shape.lg, padding: 12 },
    slotHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    slotTitle: { ...type.titleMedium, color: c.onSurface, fontSize: 14, flex: 1 },
    preview: { width: 84, height: 84, borderRadius: shape.md, backgroundColor: c.surfaceContainerHighest, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    video: { aspectRatio: 16 / 9, borderRadius: shape.md, backgroundColor: "#000", overflow: "hidden" },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    line: { flexDirection: "row", alignItems: "center", gap: 8 },
    remove: { flexDirection: "row", alignItems: "center", gap: 4 },
    removeText: { ...type.labelLarge, color: c.error, fontSize: 13 },
    errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: c.errorContainer, borderRadius: shape.lg, padding: 14 },
    errorText: { ...type.bodyMedium, color: c.onErrorContainer, fontSize: 14, lineHeight: 21, flex: 1 },
    sending: { backgroundColor: c.secondaryContainer, borderRadius: shape.lg, padding: 14, gap: 10 },
    sendingText: { ...type.titleMedium, color: c.onSecondaryContainer, fontSize: 15, flex: 1 },
  });
