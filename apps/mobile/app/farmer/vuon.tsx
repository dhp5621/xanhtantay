import { useCallback, useRef, useState } from "react";
import { View, Text, TextInput, StyleSheet, RefreshControl, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, useStyles, type Colors } from "../../constants/theme";
import { formatDateTime } from "../../constants/format";
import type { FarmProfile } from "../../constants/types";
import { useSession } from "../../hooks/useSession";
import { PressableScale, Skeleton } from "../../components/motion";
import { Button, EmptyState } from "../../components/ui";
import { KeyboardScroll } from "../../components/keyboard";
import { useDialog } from "../../components/Dialog";
import { Loader } from "../../components/Loader";
import { Icon } from "../../components/Icon";

const FIELDS = ["name", "location", "province", "description"] as const;
type Field = (typeof FIELDS)[number];
type Form = Record<Field, string>;
const MAX: Record<Field, number> = { name: 80, location: 120, province: 40, description: 1200 };
const LABELS: Record<Field, string> = { name: "Tên vườn", location: "Địa chỉ vườn", province: "Tỉnh", description: "Giới thiệu vườn" };

/** The values in force: what customers read today. */
const toForm = (f: FarmProfile): Form => ({ name: f.name ?? "", location: f.location ?? "", province: f.province ?? "", description: f.description ?? "" });
/** Where the form starts from: what the farmer asked for while a request is waiting, else the values in force. */
const toAsked = (f: FarmProfile): Form => {
  const form = toForm(f);
  const p = f.pending?.payload;
  if (p) for (const k of FIELDS) if (k in p) form[k] = p[k] ?? "";
  return form;
};
// What the server will store: single spaces for the short fields, trimmed description.
const clean = (k: Field, v: string) => (k === "description" ? v.trim() : v.replace(/\s+/g, " ").trim());

/**
 * The farmer asks to change how their farm is presented to customers. Nothing changes until the
 * operator approves it; the page address never changes.
 */
export default function FarmInfoScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { alert } = useDialog();
  const { user, loading: sessionLoading } = useSession();
  const isFarmer = user?.role === "farmer";
  const [farm, setFarm] = useState<FarmProfile | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const last = useRef<FarmProfile | null>(null);

  const load = useCallback(async () => {
    if (!isFarmer) return;
    try {
      const f: FarmProfile = await apiFetch("/farms/mine");
      const prev = last.current;
      last.current = f;
      setFarm(f);
      // Keep what the farmer is typing; an untouched form follows the server (e.g. after a decision).
      setForm((cur) => {
        if (!cur || !prev) return cur ?? toAsked(f);
        const was = toAsked(prev);
        return FIELDS.some((k) => clean(k, cur[k]) !== was[k]) ? cur : toAsked(f);
      });
      setState("ready");
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        last.current = null;
        setFarm(null);
        setState("none");
        return;
      }
      setError(e instanceof ApiError ? e.message : "Không tải được dữ liệu. Bác kéo xuống để thử lại.");
      setState((s) => (s === "ready" ? s : "error"));
    }
  }, [isFarmer]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const inForce = farm ? toForm(farm) : null;
  const asked = farm ? toAsked(farm) : null;
  const pending = farm?.pending ?? null;
  const rejected = farm?.rejected ?? null;
  // The button wakes up when the form differs from the open request, or from what is in force when there is none.
  const changed = form && asked ? FIELDS.filter((k) => clean(k, form[k]) !== asked[k]) : [];
  // A new request replaces the open one, so it carries everything that differs from what is in force.
  const wanted = form && inForce ? FIELDS.filter((k) => clean(k, form[k]) !== inForce[k]) : [];
  const asking = pending && inForce ? FIELDS.filter((k) => k in pending.payload).map((k) => ({ key: k, from: inForce[k], to: pending.payload[k] ?? "" })) : [];
  const set = (k: Field, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const apply = (next: FarmProfile) => {
    last.current = next;
    setFarm(next);
    setForm(toAsked(next));
    setError(null);
  };

  const withdraw = async () => {
    setWithdrawing(true);
    try {
      apply(await apiFetch("/farms/mine", { method: "DELETE" }));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      alert("Chưa rút được", e instanceof ApiError ? e.message : "Mạng đang yếu, xin bấm lại giúp ạ.");
    } finally {
      setWithdrawing(false);
    }
  };
  const askWithdraw = (message = "Thông tin vườn đang có hiệu lực vẫn giữ nguyên.") =>
    alert("Rút yêu cầu đang chờ duyệt?", message, [
      { text: "Không", style: "cancel" },
      { text: "Rút yêu cầu", style: "destructive", onPress: withdraw },
    ]);

  const save = async () => {
    if (!form || !changed.length) return;
    // Back to what is in force: there is nothing to ask for, only the open request to take back.
    if (!wanted.length) {
      askWithdraw("Bác đã sửa lại giống thông tin đang có hiệu lực, nên không còn gì để duyệt.");
      return;
    }
    const short = (["name", "location", "province"] as const).find((k) => wanted.includes(k) && clean(k, form[k]).length < 2);
    if (short) {
      alert("Chưa gửi được", `${LABELS[short]} cần ít nhất 2 ký tự`);
      return;
    }
    setSaving(true);
    try {
      const body = Object.fromEntries(wanted.map((k) => [k, clean(k, form[k])]));
      apply(await apiFetch("/farms/mine", { method: "PATCH", body: JSON.stringify(body) }));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      alert("Đã gửi", "Quản trị sẽ duyệt rồi thay đổi mới có hiệu lực.", undefined, { icon: "check_circle" });
    } catch (e) {
      alert("Chưa gửi được", e instanceof ApiError ? e.message : "Mạng đang yếu, xin bấm lại giúp ạ.");
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading) {
    return (
      <View style={[styles.container, { padding: 16, gap: 14 }]}>
        <Skeleton height={76} radius={shape.lg} />
        <Skeleton height={76} radius={shape.lg} />
        <Skeleton height={180} radius={shape.lg} />
      </View>
    );
  }

  if (!isFarmer) {
    return (
      <View style={[styles.container, { justifyContent: "center", padding: 16 }]}>
        <EmptyState icon="agriculture" title="Màn hình dành cho nhà vườn" description="Chỉ tài khoản nhà vườn mới sửa được thông tin vườn." action={<Button label="Về trang chủ" icon="home" onPress={() => router.replace("/tabs")} />} />
      </View>
    );
  }

  const off = !changed.length;

  return (
    <View style={styles.container}>
      <KeyboardScroll
        contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 16 }}
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
        {error ? (
          <View style={styles.errorBox}>
            <Icon name="wifi_off" size={24} color={colors.onErrorContainer} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {state === "loading" ? (
          <View style={{ gap: 14 }}>
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <Loader size={44} />
            </View>
            <Skeleton height={76} radius={shape.lg} />
            <Skeleton height={76} radius={shape.lg} />
            <Skeleton height={180} radius={shape.lg} />
          </View>
        ) : null}

        {state === "none" ? (
          <View style={styles.errorBox}>
            <Icon name="info" size={24} color={colors.onErrorContainer} />
            <Text style={styles.errorText}>Tài khoản này chưa gắn với vườn nào. Xin liên hệ quản trị để được tạo vườn giúp ạ.</Text>
          </View>
        ) : null}

        {state === "ready" && form && farm ? (
          <>
            <Text style={styles.intro}>Đây là những gì khách hàng đọc được về vườn của bác. Mọi thay đổi cần quản trị duyệt rồi mới có hiệu lực.</Text>

            {pending ? (
              <View style={styles.pending}>
                <View style={styles.bannerHead}>
                  <Icon name="hourglass_empty" size={28} color={colors.onTertiaryContainer} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingTitle}>Đang chờ quản trị duyệt</Text>
                    <Text style={styles.pendingText}>Gửi lúc {formatDateTime(pending.created_at)}</Text>
                  </View>
                </View>
                {asking.map((a) => (
                  <View key={a.key} style={styles.change}>
                    <Text style={styles.changeLabel}>{LABELS[a.key]}</Text>
                    <Text style={styles.changeFrom} numberOfLines={3}>
                      Hiện tại: {a.from || "(để trống)"}
                    </Text>
                    <Text style={styles.changeTo} numberOfLines={4}>
                      → Xin đổi thành: {a.to || "(để trống)"}
                    </Text>
                  </View>
                ))}
                <Button label="Rút yêu cầu" icon="cancel" variant="outlined" onPress={() => askWithdraw()} loading={withdrawing} disabled={saving} style={{ alignSelf: "stretch", paddingVertical: 14 }} />
              </View>
            ) : rejected ? (
              <View style={styles.rejected}>
                <Icon name="error" size={28} color={colors.onErrorContainer} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectedTitle}>Yêu cầu trước chưa được duyệt</Text>
                  {rejected.note ? <Text style={styles.rejectedText}>Lý do: {rejected.note}</Text> : null}
                  <Text style={styles.rejectedText}>Bên dưới là thông tin đang có hiệu lực.</Text>
                </View>
              </View>
            ) : null}

            <View>
              <Text style={styles.label}>Tên vườn</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={(v) => set("name", v)} maxLength={MAX.name} placeholder="Ví dụ: Vườn bác Ba" placeholderTextColor={colors.onSurfaceVariant} />
            </View>
            <View>
              <Text style={styles.label}>Địa chỉ vườn (xã/huyện, tỉnh)</Text>
              <TextInput style={styles.input} value={form.location} onChangeText={(v) => set("location", v)} maxLength={MAX.location} placeholder="Ví dụ: Ba Bể, Bắc Kạn" placeholderTextColor={colors.onSurfaceVariant} />
            </View>
            <View>
              <Text style={styles.label}>Tỉnh</Text>
              <TextInput style={styles.input} value={form.province} onChangeText={(v) => set("province", v)} maxLength={MAX.province} placeholder="Ví dụ: Bắc Kạn" placeholderTextColor={colors.onSurfaceVariant} />
            </View>
            <View>
              <Text style={styles.label}>Giới thiệu vườn</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={form.description}
                onChangeText={(v) => set("description", v)}
                maxLength={MAX.description}
                multiline
                textAlignVertical="top"
                placeholder="Bác trồng rau thế nào, đất và nước ở vườn ra sao…"
                placeholderTextColor={colors.onSurfaceVariant}
              />
              <Text style={styles.counter}>
                {form.description.length}/{MAX.description} ký tự
              </Text>
            </View>

            <View style={styles.note}>
              <Icon name="info" size={24} color={colors.onSecondaryContainer} />
              <Text style={styles.noteText}>Thay đổi chỉ có hiệu lực sau khi quản trị duyệt. Đường dẫn và mã QR của trang vườn không đổi khi bác sửa tên.</Text>
            </View>

            <Button label="Xem trang vườn như khách thấy" icon="visibility" variant="outlined" onPress={() => router.push(`/farms/${farm.slug}` as never)} style={{ alignSelf: "stretch", paddingVertical: 16 }} />
          </>
        ) : null}
      </KeyboardScroll>

      {state === "ready" && form ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <PressableScale haptic scaleTo={0.97} disabled={off || saving || withdrawing} style={[styles.saveBtn, off && styles.saveBtnOff]} onPress={save} accessibilityRole="button" accessibilityLabel="Gửi yêu cầu duyệt" accessibilityState={{ disabled: off || saving || withdrawing, busy: saving }}>
            {saving ? <Loader size={28} color={colors.onPrimary} /> : <Icon name="send" size={28} color={off ? colors.onSurfaceVariant : colors.onPrimary} />}
            <Text style={[styles.saveText, off && { color: colors.onSurfaceVariant }]}>{saving ? "Đang gửi…" : "Gửi yêu cầu duyệt"}</Text>
          </PressableScale>
          {pending ? <Text style={styles.footerHint}>Gửi lại sẽ thay cho yêu cầu đang chờ.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    intro: { ...type.bodyLarge, color: c.onSurface, fontSize: 19, lineHeight: 28 },
    errorBox: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.errorContainer, borderRadius: shape.xl, padding: 18 },
    errorText: { ...type.bodyLarge, color: c.onErrorContainer, fontSize: 17, lineHeight: 25, flex: 1 },
    pending: { backgroundColor: c.tertiaryContainer, borderRadius: shape.xl, padding: 18, gap: 14 },
    bannerHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    pendingTitle: { color: c.onTertiaryContainer, fontSize: 21, lineHeight: 29, fontWeight: "800", includeFontPadding: false },
    pendingText: { ...type.bodyLarge, color: c.onTertiaryContainer, fontSize: 16, lineHeight: 23 },
    change: { backgroundColor: c.surface, borderRadius: shape.lg, padding: 14, gap: 4 },
    changeLabel: { ...type.titleMedium, color: c.onSurface, fontSize: 17, lineHeight: 24 },
    changeFrom: { ...type.bodyLarge, color: c.onSurfaceVariant, fontSize: 16, lineHeight: 23 },
    changeTo: { ...type.bodyLarge, color: c.onSurface, fontSize: 17, lineHeight: 25, fontWeight: "700" },
    rejected: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: c.errorContainer, borderRadius: shape.xl, padding: 18 },
    rejectedTitle: { color: c.onErrorContainer, fontSize: 20, lineHeight: 28, fontWeight: "800", includeFontPadding: false },
    rejectedText: { ...type.bodyLarge, color: c.onErrorContainer, fontSize: 17, lineHeight: 25 },
    label: { ...type.titleMedium, color: c.onSurface, fontSize: 18, lineHeight: 26, marginBottom: 8 },
    input: { backgroundColor: c.surfaceContainer, borderRadius: shape.lg, paddingVertical: 16, paddingHorizontal: 16, color: c.onSurface, fontSize: 20, borderWidth: 1.5, borderColor: c.outlineVariant },
    multiline: { minHeight: 180, lineHeight: 28 },
    counter: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 15, textAlign: "right", marginTop: 6 },
    note: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: c.secondaryContainer, borderRadius: shape.xl, padding: 16 },
    noteText: { ...type.bodyLarge, color: c.onSecondaryContainer, fontSize: 17, lineHeight: 25, flex: 1 },
    footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.outlineVariant },
    saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: c.primary, borderRadius: shape.full, minHeight: 68, paddingVertical: 16, paddingHorizontal: 24 },
    footerHint: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 8 },
    saveBtnOff: { backgroundColor: c.surfaceContainerHighest },
    saveText: { color: c.onPrimary, fontSize: 22, lineHeight: 30, fontWeight: "800", includeFontPadding: false },
  });
