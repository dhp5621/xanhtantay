import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import type { HarvestCommand } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, elevation, useStyles, type Colors } from "../../constants/theme";
import { formatClock, formatClockDay, formatDay, formatKg, greetingOf } from "../../constants/format";
import type { FarmerCapacity, FarmerCommands, FarmProfile, Me } from "../../constants/types";
import { useLiveRefresh } from "../../hooks/useLive";
import { AnimIn, AnimInScale, PressableScale, Skeleton } from "../../components/motion";
import { Chip } from "../../components/ui";
import { useDialog } from "../../components/Dialog";
import { Loader } from "../../components/Loader";
import { Icon } from "../../components/Icon";

/**
 * The farmer's only screen: today's harvest command in very large type, the amounts to cut,
 * and two buttons: Có or Không. Everything else was removed on purpose.
 */
export default function FarmerScreen() {
  const styles = useStyles(makeStyles);
  const { alert } = useDialog();
  const [data, setData] = useState<FarmerCommands | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<"confirm" | "decline" | null>(null);
  const [capacity, setCapacity] = useState<FarmerCapacity | null>(null);
  const [farmPending, setFarmPending] = useState(false);
  // "Chào bác Ba!", once the profile says how the farmer is addressed.
  const [greeting, setGreeting] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Only feeds the subtitle of "Rau củ đăng ký"; the row works without it.
    apiFetch("/farmer/capacity")
      .then(setCapacity)
      .catch(() => {});
    apiFetch("/users/me")
      .then((p: Me) => setGreeting(greetingOf(p)))
      .catch(() => {});
    // Only feeds the "Chờ duyệt" chip of "Thông tin vườn".
    apiFetch("/farms/mine")
      .then((f: FarmProfile) => setFarmPending(!!f?.pending))
      .catch(() => {});
    try {
      setData(await apiFetch("/farmer/commands"));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải được lệnh thu hoạch. Xin kéo xuống để thử lại giúp ạ.");
    }
  }, []);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const answer = async (cmd: HarvestCommand, choice: "confirm" | "decline") => {
    setBusy(choice);
    try {
      await apiFetch(`/farmer/commands/${cmd.id}/${choice}`, { method: "POST" });
      if (Platform.OS !== "web") Haptics.notificationAsync(choice === "confirm" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
      // Show the answer at once; the reload brings the server's own timestamp.
      const now = new Date().toISOString();
      const next: Partial<HarvestCommand> = choice === "confirm" ? { status: "confirmed", confirmed_at: now, declined_at: null } : { status: "declined", declined_at: now };
      setData((d) => (d && d.current?.id === cmd.id ? { ...d, current: { ...d.current, ...next } } : d));
      await load();
    } catch (e) {
      alert(choice === "confirm" ? "Chưa xác nhận được" : "Chưa gửi được", e instanceof ApiError ? e.message : "Mạng đang yếu, xin bấm lại giúp ạ.");
      // The command may have been answered elsewhere (e.g. from the notification) in the meantime.
      load();
    } finally {
      setBusy(null);
    }
  };

  const current = data?.current ?? null;
  const history = (data?.commands ?? []).filter((c) => c.id !== current?.id);
  const confirmed = current?.status === "confirmed";
  const declined = current?.status === "declined";
  const supplied = capacity?.items.filter((i) => Number(i.daily_kg) > 0) ?? [];
  const links = [
    { href: "/farmer/nang-suat", icon: "scale", title: "Rau củ đăng ký", desc: capacity ? `${supplied.length} loại · ${formatKg(supplied.reduce((s, i) => s + Number(i.daily_kg), 0))} mỗi ngày` : "Mỗi ngày bác cắt được bao nhiêu ký", pending: !!capacity?.pending },
    { href: "/farmer/vuon", icon: "potted_plant", title: "Thông tin vườn", desc: "Tên, địa chỉ, lời giới thiệu", pending: farmPending },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
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
      {greeting ? <Text style={styles.greeting}>{greeting}!</Text> : null}

      {data?.farm ? (
        <AnimIn>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="potted_plant" size={20} filled color={colors.primary} />
            <Text style={styles.farm} numberOfLines={1}>
              {data.farm.name} · {data.farm.location}
            </Text>
          </View>
        </AnimIn>
      ) : null}

      {error && !data ? (
        <View style={styles.errorBox}>
          <Icon name="wifi_off" size={24} color={colors.onErrorContainer} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!data && !error ? (
        <View style={{ gap: 14 }}>
          <Skeleton height={260} radius={shape.xlIncreased} />
          <Skeleton height={76} radius={shape.xl} />
          <Skeleton height={76} radius={shape.xl} />
          <Skeleton height={72} radius={shape.full} />
        </View>
      ) : null}

      {data && !data.farm ? (
        <View style={styles.errorBox}>
          <Icon name="info" size={24} color={colors.onErrorContainer} />
          <Text style={styles.errorText}>Tài khoản này chưa gắn với vườn nào. Xin liên hệ quản trị để được tạo vườn giúp ạ.</Text>
        </View>
      ) : null}

      {current ? (
        <>
          <AnimInScale>
            <View style={[styles.command, elevation[2]]}>
              <View style={styles.commandHead}>
                <Icon name="agriculture" size={26} filled color={colors.primary} />
                <Text style={styles.commandEyebrow}>Lệnh thu hoạch</Text>
              </View>
              <Text style={styles.message}>{current.message}</Text>
              <View style={styles.dateRow}>
                <Icon name="event" size={22} color={colors.onSurfaceVariant} />
                <Text style={styles.dateText}>Giao cho khách: {formatDay(current.delivery_date)}</Text>
              </View>
            </View>
          </AnimInScale>

          <View style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>Cần cắt</Text>
            {current.items.map((it, i) => (
              <AnimIn key={it.produce_id} index={Math.min(i, 6)} delay={80}>
                <View style={styles.item}>
                  <Text style={styles.itemName}>{it.name}</Text>
                  <Text style={styles.itemKg}>{formatKg(it.kg)}</Text>
                </View>
              </AnimIn>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalKg}>{formatKg(current.total_kg)}</Text>
            </View>
          </View>

          {confirmed ? (
            <AnimInScale>
              <View style={styles.confirmed}>
                <Icon name="check_circle" size={44} filled color={colors.onPrimaryContainer} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.confirmedTitle}>Đã xác nhận</Text>
                  <Text style={styles.confirmedSub}>{current.confirmed_at ? `Đã xác nhận lúc ${formatClockDay(current.confirmed_at)}` : "Hệ thống đã ghi nhận"}</Text>
                  <Text style={styles.confirmedSub}>Xe tải lạnh sẽ qua lấy lúc 6h00.</Text>
                </View>
              </View>
            </AnimInScale>
          ) : (
            <AnimIn delay={160} style={{ gap: 12 }}>
              {declined ? (
                <View style={styles.declined} accessibilityRole="alert">
                  <Icon name="cancel" size={32} filled color={colors.onErrorContainer} />
                  <Text style={styles.declinedText}>Bác đã báo không cắt được{current.declined_at ? ` lúc ${formatClock(current.declined_at)}` : ""}</Text>
                </View>
              ) : null}
              <PressableScale
                haptic={Haptics.ImpactFeedbackStyle.Medium}
                scaleTo={0.97}
                disabled={!!busy}
                style={[styles.confirmBtn, elevation[3]]}
                onPress={() => answer(current, "confirm")}
                accessibilityRole="button"
                accessibilityLabel={declined ? "Tôi cắt được, xác nhận lại" : "Có, đã hiểu và xác nhận"}
                accessibilityState={{ disabled: !!busy, busy: busy === "confirm" }}
              >
                {busy === "confirm" ? <Loader size={32} color={colors.onPrimary} /> : <Icon name="thumb_up" size={34} filled color={colors.onPrimary} />}
                <Text style={styles.confirmText}>{busy === "confirm" ? "Đang gửi…" : declined ? "Tôi cắt được, xác nhận lại" : "Có · Đã hiểu & Xác nhận"}</Text>
              </PressableScale>
              {!declined ? (
                <PressableScale
                  haptic
                  scaleTo={0.97}
                  disabled={!!busy}
                  style={[styles.confirmBtn, styles.declineBtn]}
                  onPress={() => answer(current, "decline")}
                  accessibilityRole="button"
                  accessibilityLabel="Không, tôi không cắt được"
                  accessibilityState={{ disabled: !!busy, busy: busy === "decline" }}
                >
                  {busy === "decline" ? <Loader size={28} color={colors.onSurfaceVariant} /> : <Icon name="cancel" size={30} color={colors.onSurfaceVariant} />}
                  <Text style={[styles.confirmText, styles.declineText]}>{busy === "decline" ? "Đang gửi…" : "Không · Tôi không cắt được"}</Text>
                </PressableScale>
              ) : null}
            </AnimIn>
          )}
        </>
      ) : data?.farm ? (
        <AnimInScale>
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="bedtime" size={40} filled color={colors.onSecondaryContainer} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có lệnh thu hoạch.</Text>
            <Text style={styles.emptyBody}>18h00 mỗi ngày hệ thống sẽ gửi lệnh cho sáng hôm sau.</Text>
          </View>
        </AnimInScale>
      ) : null}

      {data?.farm ? (
        <View style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>Vườn của bác</Text>
          {links.map((l) => (
            <PressableScale key={l.href} haptic scaleTo={0.98} style={styles.link} onPress={() => router.push(l.href as never)} accessibilityRole="button" accessibilityLabel={l.pending ? `${l.title}, đang chờ duyệt` : l.title}>
              <View style={styles.linkIcon}>
                <Icon name={l.icon} size={28} filled color={colors.onPrimaryContainer} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.linkTitle}>{l.title}</Text>
                <Text style={styles.linkDesc}>{l.desc}</Text>
                {l.pending ? <Chip label="Chờ duyệt" icon="hourglass_empty" tone="tertiary" small style={{ marginTop: 6 }} /> : null}
              </View>
              <Icon name="chevron_right" size={28} color={colors.onSurfaceVariant} />
            </PressableScale>
          ))}
        </View>
      ) : null}

      {history.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>Các lệnh trước</Text>
          {history.map((c, i) => {
            const ok = c.status === "confirmed";
            const no = c.status === "declined";
            const bg = ok ? colors.primaryContainer : no ? colors.errorContainer : colors.surfaceContainerHighest;
            const fg = ok ? colors.onPrimaryContainer : no ? colors.onErrorContainer : colors.onSurfaceVariant;
            return (
              <AnimIn key={c.id} index={Math.min(i, 6)} delay={200}>
                <View style={styles.historyRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.historyDate}>{formatDay(c.delivery_date)}</Text>
                    <Text style={styles.historyKg}>{formatKg(c.total_kg)}</Text>
                  </View>
                  <View style={[styles.historyState, { backgroundColor: bg }]}>
                    <Icon name={ok ? "check_circle" : no ? "cancel" : "schedule"} size={20} filled={ok || no} color={fg} />
                    <Text style={[styles.historyStateText, { color: fg }]}>{ok ? "Đã xác nhận" : no ? "Không cắt được" : "Chưa xác nhận"}</Text>
                  </View>
                </View>
              </AnimIn>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    greeting: { ...type.titleLarge, color: c.onSurface, fontSize: 24, lineHeight: 32 },
    farm: { ...type.titleMedium, color: c.onSurfaceVariant, fontSize: 16, flex: 1 },
    errorBox: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.errorContainer, borderRadius: shape.xl, padding: 18 },
    errorText: { ...type.bodyLarge, color: c.onErrorContainer, fontSize: 17, lineHeight: 25, flex: 1 },

    command: { backgroundColor: c.surfaceContainerLowest, borderRadius: shape.xlIncreased, padding: 24, borderWidth: 3, borderColor: c.primary },
    commandHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
    commandEyebrow: { ...type.labelLarge, color: c.primary, fontSize: 16, lineHeight: 22, textTransform: "uppercase", letterSpacing: 0.8 },
    message: { color: c.onSurface, fontSize: 28, lineHeight: 40, fontWeight: "700", includeFontPadding: false },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.outlineVariant },
    dateText: { ...type.titleMedium, color: c.onSurface, fontSize: 18, lineHeight: 26, flex: 1 },

    sectionTitle: { ...type.titleLarge, color: c.onSurface, fontSize: 20 },
    item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: c.surfaceContainerLow, borderRadius: shape.xl, paddingVertical: 18, paddingHorizontal: 20 },
    itemName: { color: c.onSurface, fontSize: 24, lineHeight: 32, fontWeight: "700", flex: 1, includeFontPadding: false },
    itemKg: { color: c.primary, fontSize: 30, lineHeight: 38, fontWeight: "800", includeFontPadding: false },
    totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 4 },
    totalLabel: { ...type.titleMedium, color: c.onSurfaceVariant, fontSize: 18 },
    totalKg: { ...type.titleLarge, color: c.onSurface, fontSize: 22 },

    confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: c.primary, borderRadius: shape.full, minHeight: 84, paddingVertical: 20, paddingHorizontal: 24 },
    confirmText: { color: c.onPrimary, fontSize: 24, lineHeight: 32, fontWeight: "800", includeFontPadding: false, flexShrink: 1 },
    // Same size as "Có", but outlined and grey so it never competes with it.
    declineBtn: { backgroundColor: "transparent", borderWidth: 2, borderColor: c.outline },
    declineText: { color: c.onSurfaceVariant, fontSize: 21, fontWeight: "700" },
    declined: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.errorContainer, borderRadius: shape.xl, padding: 18 },
    declinedText: { color: c.onErrorContainer, fontSize: 19, lineHeight: 27, fontWeight: "700", flex: 1, includeFontPadding: false },
    confirmed: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: c.primaryContainer, borderRadius: shape.xlIncreased, padding: 22 },
    confirmedTitle: { color: c.onPrimaryContainer, fontSize: 24, lineHeight: 32, fontWeight: "800", includeFontPadding: false },
    confirmedSub: { ...type.bodyLarge, color: c.onPrimaryContainer, fontSize: 17, lineHeight: 25 },

    empty: { alignItems: "center", backgroundColor: c.surfaceContainerLow, borderRadius: shape.xlIncreased, paddingVertical: 40, paddingHorizontal: 24 },
    emptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: c.secondaryContainer, alignItems: "center", justifyContent: "center", marginBottom: 18 },
    emptyTitle: { color: c.onSurface, fontSize: 24, lineHeight: 32, fontWeight: "800", textAlign: "center", includeFontPadding: false },
    emptyBody: { ...type.bodyLarge, color: c.onSurfaceVariant, fontSize: 19, lineHeight: 28, textAlign: "center", marginTop: 8 },

    link: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.surfaceContainerLow, borderRadius: shape.xl, paddingVertical: 16, paddingHorizontal: 16, minHeight: 84 },
    linkIcon: { width: 52, height: 52, borderRadius: shape.lg, backgroundColor: c.primaryContainer, alignItems: "center", justifyContent: "center" },
    linkTitle: { color: c.onSurface, fontSize: 21, lineHeight: 29, fontWeight: "700", includeFontPadding: false },
    linkDesc: { ...type.bodyLarge, color: c.onSurfaceVariant, fontSize: 16, lineHeight: 23 },

    historyRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceContainerLowest, borderRadius: shape.lg, padding: 16, borderWidth: 1, borderColor: c.outlineVariant },
    historyDate: { ...type.titleMedium, color: c.onSurface, fontSize: 17 },
    historyKg: { ...type.bodyLarge, color: c.onSurfaceVariant, fontSize: 16 },
    historyState: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: shape.full, paddingVertical: 8, paddingHorizontal: 14 },
    historyStateText: { ...type.labelLarge, fontSize: 14 },
  });
