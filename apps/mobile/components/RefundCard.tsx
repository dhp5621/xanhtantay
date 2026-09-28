import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { apiFetch, ApiError } from "../constants/api";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { REFUND_STATUS, refundMethodLabel, refundReasonLabel } from "../constants/commerce";
import { formatDateTime, formatVND } from "../constants/format";
import type { Refund, RefundState } from "../constants/types";
import { PressableScale } from "./motion";
import { Button } from "./ui";
import { useDialog } from "./Dialog";
import { SmartImage } from "./SmartImage";
import { MediaViewer } from "./MediaGallery";
import { EmojiText } from "./EmojiText";
import { Icon } from "./Icon";

/**
 * Return / refund on a delivered order: the invitation to file a request, the reason none can be
 * filed, or the request with its evidence and the operator's verdict.
 */
export function RefundCard({ orderId, state, onChange }: { orderId: string; state: RefundState; onChange: (next: RefundState) => void }) {
  const styles = useStyles(makeStyles);
  const { alert } = useDialog();
  const [busy, setBusy] = useState(false);
  const request = state.request;

  if (!request) {
    if (!state.can_request) return state.reason ? <Text style={styles.quiet}>{state.reason}</Text> : null;
    return (
      <View style={styles.card}>
        <View style={styles.head}>
          <Icon name="help" size={26} color={colors.primary} />
          <Text style={styles.title}>Hộp rau chưa như ý?</Text>
        </View>
        <Text style={styles.muted}>Xin gửi ảnh và video của hộp rau, chúng tôi sẽ xác minh rồi báo lại cho bạn ạ.</Text>
        <Button label="Gửi yêu cầu trả hàng / hoàn tiền" icon="send" variant="tonal" onPress={() => router.push(`/don-hang/hoan-tien/${orderId}` as never)} style={{ alignSelf: "stretch", marginTop: 4 }} />
        {state.until ? <Text style={styles.muted}>Gửi được đến hết {formatDateTime(state.until)}</Text> : null}
      </View>
    );
  }

  const withdraw = async () => {
    setBusy(true);
    try {
      const next: RefundState | null = await apiFetch(`/orders/${orderId}/refund`, { method: "DELETE" });
      // The answer carries `request` and `can_request`; the deadline stays the one already known.
      onChange({ request: next?.request ?? null, can_request: next?.can_request ?? state.can_request, until: next?.until ?? state.until, reason: next?.reason ?? state.reason });
    } catch (e) {
      alert("Chưa rút được yêu cầu", e instanceof ApiError ? e.message : "Mạng đang yếu, xin bấm lại giúp ạ.");
    } finally {
      setBusy(false);
    }
  };
  const askWithdraw = () =>
    alert("Rút yêu cầu này?", "Ảnh, video và mô tả đã gửi sẽ được xoá. Bạn vẫn gửi lại được yêu cầu mới khi còn trong hạn.", [
      { text: "Không", style: "cancel" },
      { text: "Rút yêu cầu", style: "destructive", onPress: withdraw },
    ]);

  return (
    <View style={styles.card}>
      <Status request={request} />

      <Line label="Lý do" value={refundReasonLabel(request.reason)} />
      <View>
        <Text style={styles.label}>Mô tả chi tiết</Text>
        <EmojiText style={styles.value}>{request.description}</EmojiText>
      </View>
      <Evidence request={request} />
      <Line label="Cách xử lý mong muốn" value={refundMethodLabel(request.method) || request.method} />

      {request.status !== "pending" ? (
        <View style={[styles.verdict, request.status === "rejected" && { backgroundColor: colors.errorContainer }]}>
          {request.status === "approved" && request.resolution ? (
            <Text style={styles.verdictTitle}>
              {refundMethodLabel(request.resolution)}
              {request.resolution === "refund" && request.refund_amount != null ? `: ${formatVND(request.refund_amount)}` : ""}
            </Text>
          ) : null}
          {request.note ? <EmojiText style={[styles.verdictText, request.status === "rejected" && { color: colors.onErrorContainer }]}>{request.note}</EmojiText> : null}
          {request.reviewed_at ? <Text style={[styles.verdictText, { fontSize: 12, opacity: 0.8 }, request.status === "rejected" && { color: colors.onErrorContainer }]}>Trả lời lúc {formatDateTime(request.reviewed_at)}</Text> : null}
        </View>
      ) : (
        <>
          <Text style={styles.muted}>Chúng tôi sẽ xác minh rồi báo lại cho bạn. Cách xử lý cuối cùng tuỳ theo tình trạng hộp rau.</Text>
          <Button label="Rút yêu cầu" icon="cancel" variant="outlined" small onPress={askWithdraw} loading={busy} />
        </>
      )}
    </View>
  );
}

function Status({ request }: { request: Refund }) {
  const styles = useStyles(makeStyles);
  const status = REFUND_STATUS[request.status] ?? REFUND_STATUS.pending;
  const tone =
    request.status === "approved"
      ? { bg: colors.primaryContainer, fg: colors.onPrimaryContainer }
      : request.status === "rejected"
        ? { bg: colors.errorContainer, fg: colors.onErrorContainer }
        : { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer };
  return (
    <View style={[styles.status, { backgroundColor: tone.bg }]}>
      <Icon name={status.icon} size={24} filled color={tone.fg} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.statusTitle, { color: tone.fg }]}>{status.label}</Text>
        <Text style={[styles.statusText, { color: tone.fg }]}>Gửi lúc {formatDateTime(request.created_at)}</Text>
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/** Thumbnails of the photos and the video; a tap opens the full-screen viewer, the video in a player. */
function Evidence({ request }: { request: Refund }) {
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState<number | null>(null);
  const photos = request.photos ?? [];
  const urls = request.video_url ? [...photos, request.video_url] : photos;
  if (!urls.length) return null;
  return (
    <View>
      <Text style={styles.label}>Hình ảnh / video bằng chứng</Text>
      <View style={styles.thumbs}>
        {urls.map((u, i) => (
          <PressableScale key={u} onPress={() => setOpen(i)} scaleTo={0.95} accessibilityRole="imagebutton" accessibilityLabel={u === request.video_url ? "Xem video" : `Xem ảnh ${i + 1}`}>
            {u === request.video_url ? (
              <View style={[styles.thumb, styles.videoThumb]}>
                <Icon name="play_circle" size={30} filled color="#fff" />
                <Text style={styles.videoText}>Video</Text>
              </View>
            ) : (
              <SmartImage uri={u} style={styles.thumb} />
            )}
          </PressableScale>
        ))}
      </View>
      <MediaViewer urls={urls} index={open} onClose={() => setOpen(null)} videos={request.video_url ? [request.video_url] : undefined} />
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    card: { backgroundColor: c.surfaceContainerLow, borderRadius: shape.xl, padding: 16, gap: 12 },
    head: { flexDirection: "row", alignItems: "center", gap: 10 },
    title: { ...type.titleMedium, color: c.onSurface, fontSize: 17, flex: 1 },
    muted: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13 },
    quiet: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13, textAlign: "center", paddingHorizontal: 8 },
    status: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: shape.lg, padding: 12 },
    statusTitle: { ...type.titleMedium, fontSize: 16 },
    statusText: { ...type.bodyMedium, fontSize: 12 },
    label: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 12, marginBottom: 2 },
    value: { ...type.bodyMedium, color: c.onSurface, fontSize: 14 },
    thumbs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    thumb: { width: 64, height: 64, borderRadius: shape.md },
    videoThumb: { backgroundColor: "#1d2420", alignItems: "center", justifyContent: "center" },
    videoText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    verdict: { backgroundColor: c.primaryContainer, borderRadius: shape.lg, padding: 12, gap: 4 },
    verdictTitle: { ...type.titleMedium, color: c.onPrimaryContainer, fontSize: 16 },
    verdictText: { ...type.bodyMedium, color: c.onPrimaryContainer, fontSize: 14 },
  });
