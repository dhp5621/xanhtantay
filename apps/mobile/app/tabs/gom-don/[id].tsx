import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Share, TextInput, RefreshControl, Platform } from "react-native";
import { KeyboardScroll } from "../../../components/keyboard";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import { apiFetch, ApiError, API_URL } from "../../../constants/api";
import { colors, shape, type, elevation, useStyles, type Colors } from "../../../constants/theme";
import { SHIP_FEE, SIZE_LABELS } from "../../../constants/commerce";
import { formatCountdown, formatDateTime, formatDay, formatVND } from "../../../constants/format";
import type { GroupDetail, Me } from "../../../constants/types";
import { useCountdown } from "../../../hooks/useCountdown";
import { useLiveRefresh } from "../../../hooks/useLive";
import { useAddress } from "../../../hooks/useAddress";
import { AnimIn, AnimInScale, AnimatedProgress, PressableScale } from "../../../components/motion";
import { Avatar, Button, Chip, EmptyState } from "../../../components/ui";
import { SmartImage } from "../../../components/SmartImage";
import { QuantityStepper } from "../../../components/QuantityStepper";
import { useDialog } from "../../../components/Dialog";
import { PageLoader } from "../../../components/Loader";
import { Icon } from "../../../components/Icon";
import { EmojiText } from "../../../components/EmojiText";

/** One group order: progress to the minimum, who is in, when the book closes, join or leave. */
export default function GomDonDetailScreen() {
  const { alert } = useDialog();
  const { pronoun, Pronoun } = useAddress();
  const styles = useStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const left = useCountdown(group?.cutoff_at);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setGroup(await apiFetch(`/groups/${id}`));
    } catch {
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
      // The flat saved on the account is the default for joining.
      apiFetch("/users/me")
        .then((me: Me) => setAddress((a) => a || me?.address || ""))
        .catch(() => {});
    }, [load])
  );

  const join = async () => {
    setBusy(true);
    try {
      await apiFetch(`/groups/${id}/join`, { method: "POST", body: JSON.stringify({ quantity, address: address.trim() || undefined }) });
      alert(`${Pronoun} đã vào nhóm!`, "Rủ thêm hàng xóm cho đủ số nhà để cả nhóm miễn phí giao nhé.", undefined, { icon: "celebration" });
      await load();
    } catch (e) {
      alert("Không tham gia được", e instanceof ApiError ? e.message : "Có lỗi xảy ra, xin thử lại giúp ạ.");
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    alert("Rời nhóm gom đơn?", `Phần hộp rau của ${pronoun} trong nhóm sẽ bị huỷ và nhóm bớt một nhà. ${Pronoun} vẫn có thể vào lại trước giờ chốt sổ.`, [
      { text: "Ở lại", style: "cancel" },
      {
        text: "Rời nhóm",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await apiFetch(`/groups/${id}/leave`, { method: "POST" });
            await load();
          } catch (e) {
            alert("Không rời được", e instanceof ApiError ? e.message : "Có lỗi xảy ra, xin thử lại giúp ạ.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const inviteUrl = `${API_URL}/gom-don/${id}`;
  const copy = async () => {
    await Clipboard.setStringAsync(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const share = () => Share.share({ message: `Cùng gom hộp rau với mình nhé: ${inviteUrl}`, url: inviteUrl, title: group?.title }).catch(() => {});

  if (loading) return <PageLoader />;
  if (!group) {
    return (
      <View style={styles.center}>
        <EmptyState icon="search_off" title="Không tìm thấy nhóm này" description="Nhóm có thể đã đóng hoặc bị huỷ." action={<Button label="Về danh sách nhóm" icon="arrow_back" onPress={() => router.replace("/tabs/gom-don")} />} />
      </View>
    );
  }

  const reached = group.current_members >= group.min_members;
  const pct = Math.min(100, Math.round((group.current_members / Math.max(1, group.min_members)) * 100));
  const open = group.status === "open" && !group.closed;
  const fg = reached ? colors.onPrimaryContainer : colors.onSurface;
  const countdown = formatCountdown(left);
  const totalBoxes = group.members.reduce((s, m) => s + (m.quantity ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardScroll
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 18 }}
        keyboardShouldPersistTaps="handled"
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
        <AnimIn>
          <EmojiText style={styles.title}>{group.title}</EmojiText>
          {group.cluster ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Icon name="apartment" size={15} color={colors.primary} />
              <Text style={styles.cluster} numberOfLines={1}>
                {group.cluster.name} · {group.cluster.district}
              </Text>
            </View>
          ) : null}
        </AnimIn>

        {group.box ? (
          <AnimIn delay={40}>
            <PressableScale style={[styles.boxRow, elevation[1]]} onPress={() => router.push(`/hop-rau/${group.box!.slug}`)}>
              <SmartImage uri={group.box.image_url} style={styles.boxPhoto} loaderSize={20} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.boxName} numberOfLines={1}>{group.box.name}</Text>
                <Text style={styles.body}>
                  {SIZE_LABELS[group.box.size] ?? group.box.size} · {formatVND(group.box.price)} mỗi hộp
                </Text>
              </View>
              <Icon name="chevron_right" size={22} color={colors.onSurfaceVariant} />
            </PressableScale>
          </AnimIn>
        ) : null}

        <AnimInScale delay={80}>
          <View style={[styles.statusCard, elevation[1], { backgroundColor: reached ? colors.primaryContainer : colors.surfaceContainer }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <View style={[styles.statusIcon, { backgroundColor: reached ? colors.primary : colors.secondaryContainer }]}>
                <Icon name={reached ? "celebration" : "group_add"} size={32} filled color={reached ? colors.onPrimary : colors.onSecondaryContainer} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusTitle, { color: fg }]}>{reached ? "Đủ người, cả nhóm miễn phí giao!" : `Cần thêm ${group.min_members - group.current_members} nhà nữa`}</Text>
                <Text style={[styles.body, { color: fg, opacity: 0.8 }]}>
                  {group.current_members}/{group.min_members} nhà tham gia · {totalBoxes} hộp
                </Text>
              </View>
            </View>
            <AnimatedProgress value={pct} wavy={!reached && open} color={reached ? colors.primary : colors.secondary} height={10} />
            <View style={{ gap: 6, marginTop: 14 }}>
              <Line icon="schedule" color={fg} text={open ? `Chốt sổ ${formatDateTime(group.cutoff_at)}${countdown ? ` (còn ${countdown})` : ""}` : "Nhóm đã chốt sổ"} />
              <Line icon="event" color={fg} text={`Giao ${formatDay(group.delivery_date)}, 16h00 tại sảnh`} />
              <Line icon="local_shipping" color={fg} text={reached ? "Phí giao của mọi nhà trong nhóm là 0₫" : `Chưa đủ người lúc chốt sổ thì mỗi nhà trả ${formatVND(SHIP_FEE)} phí giao`} />
            </View>
          </View>
        </AnimInScale>

        {open && (
          <AnimIn delay={120}>
            {group.joined ? (
              <View style={styles.joinCard}>
                <Chip icon="check_circle" label="Bạn đã ở trong nhóm này" tone="primary" />
                <Text style={[styles.body, { marginTop: 8 }]}>Phần của bạn nằm trong mục Đơn hàng. Rời nhóm được cho tới giờ chốt sổ.</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <Button label="Xem đơn hàng" icon="package_2" variant="tonal" small onPress={() => router.push("/tabs/don-hang")} />
                  <Button label="Rời nhóm" icon="logout" variant="error" small onPress={leave} loading={busy} />
                </View>
              </View>
            ) : (
              <View style={styles.joinCard}>
                <Text style={styles.sectionTitle}>Tham gia nhóm</Text>
                <Text style={styles.label}>Số hộp của nhà bạn</Text>
                <QuantityStepper value={quantity} onChange={setQuantity} />
                <Text style={styles.label}>Toà, tầng, số căn hộ</Text>
                <TextInput style={styles.input} placeholder="Ví dụ: Toà S2, căn 1508" placeholderTextColor={colors.onSurfaceVariant} value={address} onChangeText={setAddress} maxLength={160} />
                {group.box ? (
                  <Text style={[styles.body, { marginTop: 12 }]}>
                    Tạm tính <Text style={{ fontWeight: "800", color: colors.primary }}>{formatVND(group.box.price * quantity)}</Text>
                    {reached ? ", miễn phí giao." : `, phí giao ${formatVND(SHIP_FEE)} sẽ về 0₫ khi nhóm đủ người.`}
                  </Text>
                ) : null}
                <Button label="Tham gia nhóm này" icon="group_add" onPress={join} loading={busy} style={{ alignSelf: "stretch", marginTop: 14 }} />
              </View>
            )}
          </AnimIn>
        )}

        {open && (
          <AnimIn delay={160}>
            <View style={styles.inviteCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name="share" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.blockLabel}>MỜI HÀNG XÓM THAM GIA</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 10 }}>
                <View style={styles.codeBox}>
                  <Text style={styles.code} numberOfLines={1}>{inviteUrl}</Text>
                </View>
                <PressableScale haptic style={styles.iconBtn} onPress={copy}>
                  <Icon name={copied ? "check" : "content_copy"} size={20} color={colors.onSecondaryContainer} />
                </PressableScale>
                <PressableScale haptic style={[styles.iconBtn, { backgroundColor: colors.primary }]} onPress={share}>
                  <Icon name="share" size={20} color={colors.onPrimary} />
                </PressableScale>
              </View>
              {copied && <Text style={[styles.body, { color: colors.primary, marginTop: 6 }]}>Đã sao chép link mời</Text>}
            </View>
          </AnimIn>
        )}

        <AnimIn delay={200}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon name="groups" size={22} filled color={colors.primary} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Các nhà trong nhóm ({group.members.length})</Text>
          </View>
          {group.members.length === 0 ? (
            <Text style={styles.body}>Chưa có ai. Nhà bạn vào đầu tiên nhé!</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {group.members.map((m, i) => (
                <AnimIn key={m.id} index={Math.min(i, 8)} delay={220}>
                  <View style={[styles.memberRow, m.me && { backgroundColor: colors.primaryContainer }]}>
                    <Avatar name={m.name} src={m.avatar_url} size={38} tone={m.me ? "primary" : "tertiary"} />
                    <Text style={[styles.memberName, m.me && { color: colors.onPrimaryContainer }]} numberOfLines={1}>
                      {m.name ?? "Hàng xóm ẩn danh"}
                      {m.me ? " (bạn)" : ""}
                    </Text>
                    <Chip label={`${m.quantity} hộp`} small tone={m.me ? "primary" : "surface"} />
                  </View>
                </AnimIn>
              ))}
            </View>
          )}
        </AnimIn>
      </KeyboardScroll>
    </View>
  );
}

function Line({ icon, text, color }: { icon: string; text: string; color: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <Icon name={icon} size={16} color={color} style={{ marginTop: 1, opacity: 0.85 }} />
      <Text style={[styles.body, { color, opacity: 0.85, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", padding: 16 },
    body: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },
    title: { ...type.headlineSmall, color: colors.onSurface, fontSize: 24 },
    cluster: { ...type.labelLarge, color: colors.primary, fontSize: 14, flex: 1 },
    boxRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 10 },
    boxPhoto: { width: 56, height: 56, borderRadius: shape.md },
    boxName: { ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
    statusCard: { borderRadius: shape.xlIncreased, padding: 22 },
    statusIcon: { width: 60, height: 60, borderRadius: shape.lg, alignItems: "center", justifyContent: "center" },
    statusTitle: { ...type.titleLarge, fontSize: 18, lineHeight: 24 },
    joinCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 18 },
    label: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 12, marginBottom: 6 },
    input: { backgroundColor: colors.surfaceContainer, borderRadius: shape.md, padding: 13, color: colors.onSurface, fontSize: 15, borderWidth: 1, borderColor: colors.outlineVariant },
    inviteCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 16 },
    blockLabel: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 11, letterSpacing: 0.6 },
    codeBox: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.md, paddingVertical: 12, paddingHorizontal: 14 },
    code: { fontSize: 12, color: colors.onSurface, fontFamily: "monospace" },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondaryContainer, alignItems: "center", justifyContent: "center" },
    sectionTitle: { ...type.titleLarge, color: colors.onSurface, fontSize: 18, marginBottom: 4 },
    memberRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.md, padding: 10 },
    memberName: { ...type.bodyMedium, color: colors.onSurface, fontSize: 14, flex: 1 },
  });
