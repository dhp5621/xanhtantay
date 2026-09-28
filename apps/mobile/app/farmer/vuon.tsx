import { useCallback, useState } from "react";
import { View, Text, TextInput, StyleSheet, RefreshControl, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, useStyles, type Colors } from "../../constants/theme";
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
const LABELS: Record<Exclude<Field, "description">, string> = { name: "Tên vườn", location: "Địa chỉ vườn", province: "Tỉnh" };

const toForm = (f: FarmProfile): Form => ({ name: f.name ?? "", location: f.location ?? "", province: f.province ?? "", description: f.description ?? "" });
// What the server will store: single spaces for the short fields, trimmed description.
const clean = (k: Field, v: string) => (k === "description" ? v.trim() : v.replace(/\s+/g, " ").trim());

/** The farmer edits how their farm is presented to customers. The page address never changes. */
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

  const load = useCallback(async () => {
    if (!isFarmer) return;
    try {
      const f: FarmProfile = await apiFetch("/farms/mine");
      setFarm(f);
      // Keep what the farmer is typing; only seed the form the first time.
      setForm((cur) => cur ?? toForm(f));
      setState("ready");
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
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

  const saved = farm ? toForm(farm) : null;
  const changed = form && saved ? FIELDS.filter((k) => clean(k, form[k]) !== saved[k]) : [];
  const set = (k: Field, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form || !changed.length) return;
    const short = (["name", "location", "province"] as const).find((k) => changed.includes(k) && clean(k, form[k]).length < 2);
    if (short) {
      alert("Chưa lưu được", `${LABELS[short]} cần ít nhất 2 ký tự`);
      return;
    }
    setSaving(true);
    try {
      const body = Object.fromEntries(changed.map((k) => [k, clean(k, form[k])]));
      const next: FarmProfile = await apiFetch("/farms/mine", { method: "PATCH", body: JSON.stringify(body) });
      setFarm(next);
      setForm(toForm(next));
      setError(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      alert("Đã lưu thay đổi", "Khách hàng sẽ thấy thông tin mới trên trang vườn của bác.", undefined, { icon: "check_circle" });
    } catch (e) {
      alert("Chưa lưu được", e instanceof ApiError ? e.message : "Mạng đang yếu, bác bấm lại giúp nhé.");
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
            <Text style={styles.errorText}>Tài khoản này chưa gắn với vườn nào. Bác liên hệ quản trị để được tạo vườn nhé.</Text>
          </View>
        ) : null}

        {state === "ready" && form && farm ? (
          <>
            <Text style={styles.intro}>Đây là những gì khách hàng đọc được về vườn của bác.</Text>

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
              <Text style={styles.noteText}>Đường dẫn và mã QR của trang vườn không đổi khi bác sửa tên.</Text>
            </View>

            <Button label="Xem trang vườn như khách thấy" icon="visibility" variant="outlined" onPress={() => router.push(`/farms/${farm.slug}` as never)} style={{ alignSelf: "stretch", paddingVertical: 16 }} />
          </>
        ) : null}
      </KeyboardScroll>

      {state === "ready" && form ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <PressableScale haptic scaleTo={0.97} disabled={off || saving} style={[styles.saveBtn, off && styles.saveBtnOff]} onPress={save} accessibilityRole="button" accessibilityLabel="Lưu thay đổi" accessibilityState={{ disabled: off || saving, busy: saving }}>
            {saving ? <Loader size={28} color={colors.onPrimary} /> : <Icon name="check" size={28} color={off ? colors.onSurfaceVariant : colors.onPrimary} />}
            <Text style={[styles.saveText, off && { color: colors.onSurfaceVariant }]}>{saving ? "Đang lưu…" : "Lưu thay đổi"}</Text>
          </PressableScale>
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
    label: { ...type.titleMedium, color: c.onSurface, fontSize: 18, lineHeight: 26, marginBottom: 8 },
    input: { backgroundColor: c.surfaceContainer, borderRadius: shape.lg, paddingVertical: 16, paddingHorizontal: 16, color: c.onSurface, fontSize: 20, borderWidth: 1.5, borderColor: c.outlineVariant },
    multiline: { minHeight: 180, lineHeight: 28 },
    counter: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 15, textAlign: "right", marginTop: 6 },
    note: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: c.secondaryContainer, borderRadius: shape.xl, padding: 16 },
    noteText: { ...type.bodyLarge, color: c.onSecondaryContainer, fontSize: 17, lineHeight: 25, flex: 1 },
    footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.outlineVariant },
    saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: c.primary, borderRadius: shape.full, minHeight: 68, paddingVertical: 16, paddingHorizontal: 24 },
    saveBtnOff: { backgroundColor: c.surfaceContainerHighest },
    saveText: { color: c.onPrimary, fontSize: 22, lineHeight: 30, fontWeight: "800", includeFontPadding: false },
  });
