import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, RefreshControl, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, useStyles, type Colors } from "../../constants/theme";
import { formatDateTime, formatKg } from "../../constants/format";
import type { FarmerCapacity, FarmerCapacityItem, ProduceProposal, ProduceProposals } from "../../constants/types";
import { useSession } from "../../hooks/useSession";
import { useAddress } from "../../hooks/useAddress";
import { useLiveRefresh } from "../../hooks/useLive";
import { AnimIn, PressableScale, Skeleton } from "../../components/motion";
import { Button, Chip, EmptyState } from "../../components/ui";
import { KeyboardScroll } from "../../components/keyboard";
import { QuantityStepper } from "../../components/QuantityStepper";
import { SmartImage } from "../../components/SmartImage";
import { ProduceProposalSheet } from "../../components/ProduceProposalSheet";
import { useDialog } from "../../components/Dialog";
import { Loader } from "../../components/Loader";
import { Icon } from "../../components/Icon";

const MAX_KG = 500;
const STEP_KG = 5;
const FIRST_KG = 10;

/**
 * What the farm can cut each day, per produce. The farmer only asks: nothing changes until the
 * operator approves it. Rows stay in the group they are in force in while the farmer edits, so
 * nothing jumps around under their finger; one button sends every change as one request.
 */
export default function FarmerCapacityScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { alert } = useDialog();
  const { user, loading: sessionLoading } = useSession();
  const { Pronoun } = useAddress();
  const isFarmer = user?.role === "farmer";
  const [data, setData] = useState<FarmerCapacity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  // Only what the farmer changed on screen: produce_id → kg. Survives a reload of the server's values.
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [proposing, setProposing] = useState(false);
  // The proposal being withdrawn, by id.
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isFarmer) return;
    try {
      setData(await apiFetch("/farmer/capacity"));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải được dữ liệu. Xin kéo xuống để thử lại giúp ạ.");
    }
  }, [isFarmer]);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const items = useMemo(() => (data?.items ?? []).map((i) => ({ ...i, daily_kg: Number(i.daily_kg) || 0, pending_kg: i.pending_kg == null ? null : Number(i.pending_kg) || 0 })), [data]);
  const pending = data?.pending ?? null;
  const rejected = data?.rejected ?? null;
  // Where a row starts from: what was asked for while a request is waiting, else what is in force.
  const baseOf = (i: FarmerCapacityItem) => i.pending_kg ?? i.daily_kg;
  const kgOf = (i: FarmerCapacityItem) => draft[i.produce_id] ?? baseOf(i);
  // The button wakes up when the screen differs from the open request, or from what is in force when there is none.
  const changed = items.filter((i) => kgOf(i) !== baseOf(i));
  // A new request replaces the open one, so it carries every row that differs from what is in force.
  const wanted = items.filter((i) => kgOf(i) !== i.daily_kg);
  const supplied = items.filter((i) => i.daily_kg > 0);
  const others = items.filter((i) => i.daily_kg === 0);
  const total = Number(data?.total_kg) || 0;

  const setKg = (id: string, kg: number) => setDraft((d) => ({ ...d, [id]: kg }));
  const tap = (id: string, kg: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setKg(id, kg);
  };

  const apply = (next: FarmerCapacity) => {
    // The proposals on screen stay when an answer comes without them.
    setData((d) => ({ ...next, proposals: next.proposals ?? d?.proposals }));
    setDraft({});
    setError(null);
  };

  const withdraw = async () => {
    setWithdrawing(true);
    try {
      apply(await apiFetch("/farmer/capacity", { method: "DELETE" }));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      alert("Chưa rút được", e instanceof ApiError ? e.message : "Mạng đang yếu, xin bấm lại giúp ạ.");
    } finally {
      setWithdrawing(false);
    }
  };
  const askWithdraw = (message = "Số ký đang có hiệu lực vẫn giữ nguyên.") =>
    alert("Rút yêu cầu đang chờ duyệt?", message, [
      { text: "Không", style: "cancel" },
      { text: "Rút yêu cầu", style: "destructive", onPress: withdraw },
    ]);

  const proposals = data?.proposals ?? [];
  const setProposals = (next: ProduceProposal[]) => setData((d) => (d ? { ...d, proposals: next } : d));
  const withdrawProposal = async (p: ProduceProposal) => {
    setRemoving(p.id);
    try {
      const res: ProduceProposals = await apiFetch(`/farmer/produce/${encodeURIComponent(p.id)}`, { method: "DELETE" });
      setProposals(res?.proposals ?? []);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      alert("Chưa rút được", e instanceof ApiError ? e.message : "Mạng đang yếu, xin bấm lại giúp ạ.");
      load();
    } finally {
      setRemoving(null);
    }
  };
  const askWithdrawProposal = (p: ProduceProposal) =>
    alert(`Rút yêu cầu đăng ký "${p.name}"?`, "Quản trị sẽ không duyệt loại rau củ này nữa. Sau này vẫn gửi lại được ạ.", [
      { text: "Không", style: "cancel" },
      { text: "Rút yêu cầu", style: "destructive", onPress: () => withdrawProposal(p) },
    ]);

  const save = async () => {
    if (!changed.length) return;
    // Back to what is in force: there is nothing to ask for, only the open request to take back.
    if (!wanted.length) {
      askWithdraw(`${Pronoun} đã sửa lại giống số ký đang có hiệu lực, nên không còn gì để duyệt.`);
      return;
    }
    setSaving(true);
    try {
      apply(await apiFetch("/farmer/capacity", { method: "PUT", body: JSON.stringify({ items: wanted.map((i) => ({ produce_id: i.produce_id, daily_kg: kgOf(i) })) }) }));
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
    const asked = i.pending_kg;
    const edited = kg !== baseOf(i);
    // A row not registered yet only shows its one button until the farmer presses it.
    const open = wasSupplied || asked != null || i.produce_id in draft;
    return (
      <AnimIn key={i.produce_id} index={Math.min(index, 6)} delay={60}>
        <View style={[styles.row, edited && styles.rowEdited]}>
          <View style={styles.rowHead}>
            <SmartImage uri={i.image_url} style={styles.photo} loaderSize={22} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name}>{i.name}</Text>
              {asked != null ? (
                <>
                  <Text style={styles.state}>{wasSupplied ? `Đang có hiệu lực: ${formatKg(i.daily_kg)}` : "Đang có hiệu lực: chưa đăng ký"}</Text>
                  <Text style={styles.asked}>{asked === 0 ? "Đã xin ngừng cung cấp, chờ duyệt" : wasSupplied ? `Đã xin đổi thành: ${formatKg(asked)}, chờ duyệt` : `Đã xin đăng ký ${formatKg(asked)}, chờ duyệt`}</Text>
                  {edited ? <Text style={[styles.state, { color: colors.tertiary }]}>{kg === i.daily_kg ? "Sẽ bỏ yêu cầu này · chưa gửi" : kg === 0 ? "Sẽ xin ngừng cung cấp · chưa gửi" : `Sẽ xin ${formatKg(kg)} · chưa gửi`}</Text> : null}
                </>
              ) : (
                <Text style={[styles.state, edited && { color: colors.tertiary }]}>
                  {edited ? (kg === 0 ? "Sẽ xin ngừng cung cấp · chưa gửi" : wasSupplied ? `Đang là ${formatKg(i.daily_kg)} · chưa gửi` : "Xin đăng ký mới · chưa gửi") : wasSupplied ? `${formatKg(i.daily_kg)} mỗi ngày` : "Chưa đăng ký"}
                </Text>
              )}
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
        <Text style={styles.intro}>{Pronoun} đăng ký mỗi ngày cắt được bao nhiêu ký. Hệ thống không bao giờ gửi lệnh nhiều hơn số này. Mọi thay đổi cần quản trị duyệt rồi mới có hiệu lực.</Text>

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
            {pending ? (
              <View style={styles.pending}>
                <View style={styles.bannerHead}>
                  <Icon name="hourglass_empty" size={28} color={colors.onTertiaryContainer} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingTitle}>Đang chờ quản trị duyệt</Text>
                    <Text style={styles.pendingText}>Gửi lúc {formatDateTime(pending.created_at)}</Text>
                  </View>
                </View>
                <View style={styles.change}>
                  {pending.payload.map((c) => (
                    <Text key={c.produce_id} style={styles.changeText}>
                      {c.name}: {Number(c.to_kg) === 0 ? `ngừng cung cấp (đang ${formatKg(c.from_kg)})` : Number(c.from_kg) === 0 ? `đăng ký ${formatKg(c.to_kg)}` : `${formatKg(c.from_kg)} → ${formatKg(c.to_kg)}`}
                    </Text>
                  ))}
                </View>
                <Button label="Rút yêu cầu" icon="cancel" variant="outlined" onPress={() => askWithdraw()} loading={withdrawing} disabled={saving} style={{ alignSelf: "stretch", paddingVertical: 14 }} />
              </View>
            ) : rejected ? (
              <View style={styles.rejected}>
                <Icon name="error" size={28} color={colors.onErrorContainer} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectedTitle}>Yêu cầu trước chưa được duyệt</Text>
                  {rejected.note ? <Text style={styles.rejectedText}>Lý do: {rejected.note}</Text> : null}
                  <Text style={styles.rejectedText}>Bên dưới là số ký đang có hiệu lực.</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.summary}>
              <Icon name="scale" size={34} filled color={colors.onPrimaryContainer} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryValue}>
                  {supplied.length} loại · {formatKg(total)}
                </Text>
                <Text style={styles.summaryLabel}>mỗi ngày, đang có hiệu lực{changed.length ? " · có thay đổi chưa gửi" : ""}</Text>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={styles.sectionTitle}>Đang cung cấp</Text>
              {supplied.length ? supplied.map(row) : <Text style={styles.hint}>{Pronoun} chưa đăng ký loại nào. Xin bấm “Đăng ký” ở loại rau củ bên dưới ạ.</Text>}
            </View>

            {others.length ? (
              <View style={{ gap: 10 }}>
                <Text style={styles.sectionTitle}>Chưa đăng ký</Text>
                {others.map(row)}
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              <Text style={styles.sectionTitle}>Rau củ khác</Text>
              <Text style={styles.hint}>Vườn có loại rau củ chưa có trong danh sách? {Pronoun} gửi tên, ảnh và sản lượng, quản trị duyệt xong là có trong danh sách.</Text>
              <Button label="Đăng ký rau củ mới" icon="add" variant="tonal" onPress={() => setProposing(true)} style={styles.proposeBtn} />
              {proposals.map((p) => (
                <View key={p.id} style={styles.row}>
                  <View style={styles.rowHead}>
                    <SmartImage uri={p.image_url} style={styles.photo} loaderSize={22} />
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                      <Text style={styles.name}>{p.name}</Text>
                      <Text style={styles.state}>{formatKg(Number(p.daily_kg) || 0)} mỗi ngày</Text>
                      {p.status === "pending" ? <Chip label="Chờ duyệt" icon="hourglass_empty" tone="tertiary" /> : p.status === "approved" ? <Chip label="Đã duyệt" icon="check_circle" tone="primary" /> : <Chip label="Chưa được duyệt" icon="error" tone="error" />}
                    </View>
                  </View>
                  {p.status === "rejected" && p.reason ? <Text style={styles.reason}>Lý do: {p.reason}</Text> : null}
                  {p.status === "pending" ? <Button label="Rút yêu cầu" icon="cancel" variant="outlined" onPress={() => askWithdrawProposal(p)} loading={removing === p.id} disabled={!!removing} style={{ alignSelf: "stretch", paddingVertical: 14 }} /> : null}
                </View>
              ))}
            </View>

            <View style={styles.note}>
              <Icon name="info" size={24} color={colors.onSecondaryContainer} />
              <Text style={styles.noteText}>Thay đổi chỉ có hiệu lực sau khi quản trị duyệt. Lệnh đã gửi không đổi.</Text>
            </View>
          </>
        ) : null}
      </KeyboardScroll>

      {data ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <PressableScale
            haptic
            scaleTo={0.97}
            disabled={!changed.length || saving || withdrawing}
            style={[styles.saveBtn, !changed.length && styles.saveBtnOff]}
            onPress={save}
            accessibilityRole="button"
            accessibilityLabel="Gửi yêu cầu duyệt"
            accessibilityState={{ disabled: !changed.length || saving || withdrawing, busy: saving }}
          >
            {saving ? <Loader size={28} color={colors.onPrimary} /> : <Icon name="send" size={28} color={changed.length ? colors.onPrimary : colors.onSurfaceVariant} />}
            <Text style={[styles.saveText, !changed.length && { color: colors.onSurfaceVariant }]}>{saving ? "Đang gửi…" : "Gửi yêu cầu duyệt"}</Text>
          </PressableScale>
          {pending ? <Text style={styles.footerHint}>Gửi lại sẽ thay cho yêu cầu đang chờ.</Text> : null}
        </View>
      ) : null}

      <ProduceProposalSheet
        visible={proposing}
        onClose={() => setProposing(false)}
        onSent={(next) => {
          setProposals(next);
          setProposing(false);
          alert("Đã gửi", "Quản trị duyệt xong là rau củ này có trong danh sách ạ.", undefined, { icon: "check_circle" });
        }}
      />
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
    changeText: { ...type.bodyLarge, color: c.onSurface, fontSize: 17, lineHeight: 25 },
    rejected: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: c.errorContainer, borderRadius: shape.xl, padding: 18 },
    rejectedTitle: { color: c.onErrorContainer, fontSize: 20, lineHeight: 28, fontWeight: "800", includeFontPadding: false },
    rejectedText: { ...type.bodyLarge, color: c.onErrorContainer, fontSize: 17, lineHeight: 25 },

    summary: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: c.primaryContainer, borderRadius: shape.xlIncreased, padding: 20 },
    summaryValue: { color: c.onPrimaryContainer, fontSize: 26, lineHeight: 34, fontWeight: "800", includeFontPadding: false },
    summaryLabel: { ...type.bodyLarge, color: c.onPrimaryContainer, fontSize: 17, lineHeight: 24 },

    sectionTitle: { ...type.titleLarge, color: c.onSurface, fontSize: 21, marginTop: 4 },
    hint: { ...type.bodyLarge, color: c.onSurfaceVariant, fontSize: 17, lineHeight: 25 },

    row: { backgroundColor: c.surfaceContainerLow, borderRadius: shape.xl, padding: 16, gap: 14, borderWidth: 2, borderColor: "transparent" },
    rowEdited: { borderColor: c.tertiary },
    rowHead: { flexDirection: "row", alignItems: "center", gap: 14 },
    photo: { width: 68, height: 68, borderRadius: shape.lg },
    name: { color: c.onSurface, fontSize: 22, lineHeight: 30, fontWeight: "700", includeFontPadding: false },
    asked: { ...type.bodyLarge, color: c.tertiary, fontSize: 16, lineHeight: 23, fontWeight: "700" },
    state: { ...type.bodyLarge, color: c.onSurfaceVariant, fontSize: 16, lineHeight: 23 },
    rowControls: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
    textBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48, paddingHorizontal: 8 },
    textBtnLabel: { ...type.labelLarge, color: c.primary, fontSize: 17, lineHeight: 24 },
    registerBtn: { alignSelf: "stretch", paddingVertical: 16 },
    proposeBtn: { alignSelf: "stretch", paddingVertical: 18 },
    reason: { ...type.bodyLarge, color: c.error, fontSize: 17, lineHeight: 25 },

    note: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: c.secondaryContainer, borderRadius: shape.xl, padding: 16 },
    noteText: { ...type.bodyLarge, color: c.onSecondaryContainer, fontSize: 17, lineHeight: 25, flex: 1 },

    footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.outlineVariant },
    saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: c.primary, borderRadius: shape.full, minHeight: 68, paddingVertical: 16, paddingHorizontal: 24 },
    footerHint: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 8 },
    saveBtnOff: { backgroundColor: c.surfaceContainerHighest },
    saveText: { color: c.onPrimary, fontSize: 22, lineHeight: 30, fontWeight: "800", includeFontPadding: false },
  });
