import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, RefreshControl, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, useStyles, type Colors } from "../../constants/theme";
import { formatKg } from "../../constants/format";
import type { FarmerCapacity, FarmerCapacityItem } from "../../constants/types";
import { useSession } from "../../hooks/useSession";
import { useLiveRefresh } from "../../hooks/useLive";
import { AnimIn, PressableScale, Skeleton } from "../../components/motion";
import { Button, EmptyState } from "../../components/ui";
import { KeyboardScroll } from "../../components/keyboard";
import { QuantityStepper } from "../../components/QuantityStepper";
import { SmartImage } from "../../components/SmartImage";
import { useDialog } from "../../components/Dialog";
import { Loader } from "../../components/Loader";
import { Icon } from "../../components/Icon";

const MAX_KG = 500;
const STEP_KG = 5;
const FIRST_KG = 10;

/**
 * What the farm can cut each day, per produce. Rows stay in the group they were saved in while the
 * farmer edits, so nothing jumps around under their finger; one button saves every change.
 */
export default function FarmerCapacityScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { alert } = useDialog();
  const { user, loading: sessionLoading } = useSession();
  const isFarmer = user?.role === "farmer";
  const [data, setData] = useState<FarmerCapacity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  // Only what the farmer changed on screen: produce_id → kg. Survives a reload of the saved values.
  const [draft, setDraft] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!isFarmer) return;
    try {
      setData(await apiFetch("/farmer/capacity"));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải được dữ liệu. Bác kéo xuống để thử lại.");
    }
  }, [isFarmer]);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const items = useMemo(() => (data?.items ?? []).map((i) => ({ ...i, daily_kg: Number(i.daily_kg) || 0 })), [data]);
  const kgOf = (i: FarmerCapacityItem) => draft[i.produce_id] ?? i.daily_kg;
  const changed = items.filter((i) => kgOf(i) !== i.daily_kg);
  const supplied = items.filter((i) => i.daily_kg > 0);
  const others = items.filter((i) => i.daily_kg === 0);
  const count = items.filter((i) => kgOf(i) > 0).length;
  const total = items.reduce((s, i) => s + kgOf(i), 0);

  const setKg = (id: string, kg: number) => setDraft((d) => ({ ...d, [id]: kg }));
  const tap = (id: string, kg: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setKg(id, kg);
  };

  const save = async () => {
    if (!changed.length) return;
    setSaving(true);
    try {
      const next: FarmerCapacity = await apiFetch("/farmer/capacity", { method: "PUT", body: JSON.stringify({ items: changed.map((i) => ({ produce_id: i.produce_id, daily_kg: kgOf(i) })) }) });
      setData(next);
      setDraft({});
      setError(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      alert("Đã lưu thay đổi", "Số ký mới áp dụng từ lần chốt sổ 18h00 kế tiếp.", undefined, { icon: "check_circle" });
    } catch (e) {
      alert("Chưa lưu được", e instanceof ApiError ? e.message : "Mạng đang yếu, bác bấm lại giúp nhé.");
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading) {
    return (
      <View style={[styles.container, { padding: 16, gap: 14 }]}>
        <Skeleton height={96} radius={shape.xl} />
        <Skeleton height={150} radius={shape.xl} />
        <Skeleton height={150} radius={shape.xl} />
      </View>
    );
  }

  if (!isFarmer) {
    return (
      <View style={[styles.container, { justifyContent: "center", padding: 16 }]}>
        <EmptyState icon="agriculture" title="Màn hình dành cho nhà vườn" description="Chỉ tài khoản nhà vườn mới đăng ký được rau củ cung cấp." action={<Button label="Về trang chủ" icon="home" onPress={() => router.replace("/tabs")} />} />
      </View>
    );
  }

  const row = (i: FarmerCapacityItem, index: number) => {
    const kg = kgOf(i);
    const wasSupplied = i.daily_kg > 0;
    const edited = kg !== i.daily_kg;
    // A row not registered yet only shows its one button until the farmer presses it.
    const open = wasSupplied || i.produce_id in draft;
    return (
      <AnimIn key={i.produce_id} index={Math.min(index, 6)} delay={60}>
        <View style={[styles.row, edited && styles.rowEdited]}>
          <View style={styles.rowHead}>
            <SmartImage uri={i.image_url} style={styles.photo} loaderSize={22} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name}>{i.name}</Text>
              <Text style={[styles.state, edited && { color: colors.tertiary }]}>
                {edited ? (kg === 0 ? "Sẽ ngừng cung cấp · chưa lưu" : wasSupplied ? `Đang là ${formatKg(i.daily_kg)} · chưa lưu` : "Mới đăng ký · chưa lưu") : wasSupplied ? `${formatKg(i.daily_kg)} mỗi ngày` : "Chưa đăng ký"}
              </Text>
            </View>
          </View>
          {open ? (
            <View style={styles.rowControls}>
              <QuantityStepper value={kg} onChange={(n) => setKg(i.produce_id, n)} min={0} max={MAX_KG} step={STEP_KG} unit="kg/ngày" large />
              {kg > 0 ? (
                <PressableScale style={styles.textBtn} onPress={() => tap(i.produce_id, 0)} accessibilityRole="button">
                  <Icon name="cancel" size={22} color={colors.error} />
                  <Text style={[styles.textBtnLabel, { color: colors.error }]}>{wasSupplied ? "Ngừng cung cấp" : "Bỏ đăng ký"}</Text>
                </PressableScale>
              ) : wasSupplied ? (
                <PressableScale style={styles.textBtn} onPress={() => tap(i.produce_id, i.daily_kg)} accessibilityRole="button">
                  <Icon name="refresh" size={22} color={colors.primary} />
                  <Text style={styles.textBtnLabel}>Cung cấp lại</Text>
                </PressableScale>
              ) : (
                <PressableScale style={styles.textBtn} onPress={() => tap(i.produce_id, FIRST_KG)} accessibilityRole="button">
                  <Icon name="add" size={22} color={colors.primary} />
                  <Text style={styles.textBtnLabel}>Đăng ký</Text>
                </PressableScale>
              )}
            </View>
          ) : (
            <Button label="Đăng ký" icon="add" variant="tonal" onPress={() => tap(i.produce_id, FIRST_KG)} style={styles.registerBtn} />
          )}
        </View>
      </AnimIn>
    );
  };

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
        <Text style={styles.intro}>Bác đăng ký mỗi ngày cắt được bao nhiêu ký. Hệ thống không bao giờ gửi lệnh nhiều hơn số này.</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="wifi_off" size={24} color={colors.onErrorContainer} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!data && !error ? (
          <View style={{ gap: 14 }}>
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <Loader size={44} />
            </View>
            <Skeleton height={96} radius={shape.xl} />
            <Skeleton height={150} radius={shape.xl} />
            <Skeleton height={150} radius={shape.xl} />
          </View>
        ) : null}

        {data ? (
          <>
            <View style={styles.summary}>
              <Icon name="scale" size={34} filled color={colors.onPrimaryContainer} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryValue}>
                  {count} loại · {formatKg(total)}
                </Text>
                <Text style={styles.summaryLabel}>mỗi ngày{changed.length ? " · có thay đổi chưa lưu" : ""}</Text>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={styles.sectionTitle}>Đang cung cấp</Text>
              {supplied.length ? supplied.map(row) : <Text style={styles.hint}>Bác chưa đăng ký loại nào. Bác bấm “Đăng ký” ở loại rau củ bên dưới nhé.</Text>}
            </View>

            {others.length ? (
              <View style={{ gap: 10 }}>
                <Text style={styles.sectionTitle}>Chưa đăng ký</Text>
                {others.map(row)}
              </View>
            ) : null}

            <View style={styles.note}>
              <Icon name="info" size={24} color={colors.onSecondaryContainer} />
              <Text style={styles.noteText}>Thay đổi áp dụng từ lần chốt sổ 18h00 kế tiếp. Lệnh đã gửi không đổi.</Text>
            </View>
          </>
        ) : null}
      </KeyboardScroll>

      {data ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <PressableScale
            haptic
            scaleTo={0.97}
            disabled={!changed.length || saving}
            style={[styles.saveBtn, !changed.length && styles.saveBtnOff]}
            onPress={save}
            accessibilityRole="button"
            accessibilityLabel="Lưu thay đổi"
            accessibilityState={{ disabled: !changed.length || saving, busy: saving }}
          >
            {saving ? <Loader size={28} color={colors.onPrimary} /> : <Icon name="check" size={28} color={changed.length ? colors.onPrimary : colors.onSurfaceVariant} />}
            <Text style={[styles.saveText, !changed.length && { color: colors.onSurfaceVariant }]}>{saving ? "Đang lưu…" : "Lưu thay đổi"}</Text>
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

    summary: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: c.primaryContainer, borderRadius: shape.xlIncreased, padding: 20 },
    summaryValue: { color: c.onPrimaryContainer, fontSize: 26, lineHeight: 34, fontWeight: "800", includeFontPadding: false, fontVariant: ["tabular-nums"] },
    summaryLabel: { ...type.bodyLarge, color: c.onPrimaryContainer, fontSize: 17, lineHeight: 24 },

    sectionTitle: { ...type.titleLarge, color: c.onSurface, fontSize: 21, marginTop: 4 },
    hint: { ...type.bodyLarge, color: c.onSurfaceVariant, fontSize: 17, lineHeight: 25 },

    row: { backgroundColor: c.surfaceContainerLow, borderRadius: shape.xl, padding: 16, gap: 14, borderWidth: 2, borderColor: "transparent" },
    rowEdited: { borderColor: c.tertiary },
    rowHead: { flexDirection: "row", alignItems: "center", gap: 14 },
    photo: { width: 68, height: 68, borderRadius: shape.lg },
    name: { color: c.onSurface, fontSize: 22, lineHeight: 30, fontWeight: "700", includeFontPadding: false },
    state: { ...type.bodyLarge, color: c.onSurfaceVariant, fontSize: 16, lineHeight: 23 },
    rowControls: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
    textBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48, paddingHorizontal: 8 },
    textBtnLabel: { ...type.labelLarge, color: c.primary, fontSize: 17, lineHeight: 24 },
    registerBtn: { alignSelf: "stretch", paddingVertical: 16 },

    note: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: c.secondaryContainer, borderRadius: shape.xl, padding: 16 },
    noteText: { ...type.bodyLarge, color: c.onSecondaryContainer, fontSize: 17, lineHeight: 25, flex: 1 },

    footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.outlineVariant },
    saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: c.primary, borderRadius: shape.full, minHeight: 68, paddingVertical: 16, paddingHorizontal: 24 },
    saveBtnOff: { backgroundColor: c.surfaceContainerHighest },
    saveText: { color: c.onPrimary, fontSize: 22, lineHeight: 30, fontWeight: "800", includeFontPadding: false },
  });
