import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, Share, TouchableOpacity } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import type { Farm, GroupOrder } from "@xanhtantay/types";
import { apiFetch, ApiError, API_URL } from "../../../constants/api";
import { useSession } from "../../../hooks/useSession";
import { colors, shape, type, elevation } from "../../../constants/theme";
import { daysUntil, formatDate } from "../../../constants/format";
import { AnimIn, AnimInScale, AnimatedProgress, PressableScale } from "../../../components/motion";
import { Avatar, Button, Chip } from "../../../components/ui";
import { Icon } from "../../../components/Icon";

interface GroupMember { id: string; user_id: string; name: string | null }
type GroupDetail = GroupOrder & { members: GroupMember[]; joined: boolean };

/** Mirrors apps/web/src/app/(customer)/gom-don/[id]/page.tsx + JoinGroupButton. */
export default function GomDonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    apiFetch(`/groups/${id}`)
      .then(async (row: GroupDetail) => {
        setGroup(row);
        setFarm(await apiFetch(`/farms/${row.farm_id}`).catch(() => null));
      })
      .catch(() => setGroup(null))
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const join = async () => {
    if (!user) {
      router.push(`/dang-nhap?next=/tabs/gom-don/${id}&role=customer`);
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/groups/${id}/join`, { method: "POST", body: JSON.stringify({ items: [] }) });
      Alert.alert("Bạn đã vào nhóm!", "Rủ thêm hàng xóm để được freeship nhé.");
      load();
    } catch (e) {
      Alert.alert("Không tham gia được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    Alert.alert("Rời nhóm gom đơn?", "Nhóm sẽ bớt một người và có thể mất điều kiện freeship. Bạn vẫn có thể tham gia lại trước hạn chốt.", [
      { text: "Ở lại", style: "cancel" },
      {
        text: "Rời nhóm",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await apiFetch(`/groups/${id}/leave`, { method: "POST" });
            Alert.alert("Đã rời nhóm", "Vào lại bất cứ lúc nào trước hạn chốt.");
            load();
          } catch (e) {
            Alert.alert("Không rời được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
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
  const share = () => Share.share({ message: `Cùng gom đơn rau sạch với mình nhé: ${inviteUrl}`, url: inviteUrl, title: group?.title }).catch(() => {});

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!group) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Không tìm thấy nhóm này.</Text>
      </View>
    );
  }

  const pct = Math.min(100, Math.round((group.current_members / group.min_members) * 100));
  const freeship = group.current_members >= group.min_members;
  const left = daysUntil(group.deadline);
  const canAct = group.status === "open" && left >= 0;
  const fg = freeship ? colors.onPrimaryContainer : colors.onSurface;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 18 }}>
      <AnimIn>
        <Text style={styles.title}>{group.title}</Text>
        {farm && (
          <TouchableOpacity onPress={() => router.push(`/farms/${farm.id}`)}>
            <Text style={styles.farmLink}><Icon name="potted_plant" size={14} filled color={colors.primary} /> {farm.name} · {farm.location}</Text>
          </TouchableOpacity>
        )}
      </AnimIn>

      <AnimInScale delay={60}>
        <View style={[styles.statusCard, elevation[1], { backgroundColor: freeship ? colors.primaryContainer : colors.surfaceContainer }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <View style={[styles.statusIcon, { backgroundColor: freeship ? colors.primary : colors.secondaryContainer }]}>
              <Icon name={freeship ? "celebration" : "group_add"} size={32} filled color={freeship ? colors.onPrimary : colors.onSecondaryContainer} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: fg }]}>{freeship ? "Đủ điều kiện freeship!" : `Cần thêm ${group.min_members - group.current_members} người nữa`}</Text>
              <Text style={[styles.body, { color: fg, opacity: 0.8 }]}>{group.current_members}/{group.min_members} người tham gia</Text>
            </View>
          </View>
          <AnimatedProgress value={pct} wavy={!freeship} color={freeship ? colors.primary : colors.secondary} height={10} />
          <View style={{ gap: 4, marginTop: 12 }}>
            <Text style={[styles.body, { color: fg, opacity: 0.85 }]}><Icon name="event" size={13} color={fg} /> Chốt {formatDate(group.deadline, { weekday: "long", day: "numeric", month: "long" })}{left > 0 ? ` (còn ${left} ngày)` : " (hôm nay)"}</Text>
            <Text style={[styles.body, { color: fg, opacity: 0.85 }]}><Icon name="location_on" size={13} color={fg} /> {group.shipping_address}</Text>
          </View>
        </View>
      </AnimInScale>

      <AnimIn delay={120}>
        <View style={styles.inviteCard}>
          <Text style={styles.label}><Icon name="share" size={13} color={colors.onSurfaceVariant} /> MỜI BẠN BÈ THAM GIA</Text>
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

      <AnimIn delay={180}>
        <Text style={styles.sectionTitle}><Icon name="groups" size={20} filled color={colors.primary} /> Thành viên ({group.members.length})</Text>
        {group.members.length === 0 ? (
          <Text style={styles.body}>Chưa có ai. Hãy là người đầu tiên!</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {group.members.map((m, i) => {
              const me = !!user && m.user_id === user.id;
              return (
                <AnimIn key={m.id} index={i} delay={200}>
                  <View style={styles.memberRow}>
                    <Avatar name={m.name} size={36} tone={me ? "primary" : "tertiary"} />
                    <Text style={styles.memberName}>
                      {m.name ?? "Thành viên ẩn danh"}
                      {me ? " (bạn)" : ""}
                    </Text>
                  </View>
                </AnimIn>
              );
            })}
          </View>
        )}
      </AnimIn>

      {canAct && (
        <AnimIn delay={260} style={{ alignItems: "center", marginTop: 6 }}>
          {group.joined ? (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              <Chip icon="check_circle" label="Bạn đã tham gia nhóm này" tone="primary" />
              <Button label="Rời nhóm" icon="logout" variant="error" small onPress={leave} loading={busy} />
            </View>
          ) : (
            <Button label={busy ? "Đang tham gia…" : "Tham gia nhóm này"} icon="groups" onPress={join} loading={busy} style={{ paddingHorizontal: 30 }} />
          )}
        </AnimIn>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  body: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },
  title: { ...type.headlineSmall, color: colors.onSurface, fontSize: 24 },
  farmLink: { ...type.labelLarge, color: colors.primary, marginTop: 4, fontSize: 14 },
  statusCard: { borderRadius: shape.xlIncreased, padding: 22 },
  statusIcon: { width: 60, height: 60, borderRadius: shape.lg, alignItems: "center", justifyContent: "center" },
  statusTitle: { ...type.titleLarge, fontSize: 18 },
  inviteCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 16 },
  label: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 11, letterSpacing: 0.6 },
  codeBox: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.md, paddingVertical: 12, paddingHorizontal: 14 },
  code: { fontSize: 12, color: colors.onSurface, fontFamily: "monospace" },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondaryContainer, alignItems: "center", justifyContent: "center" },
  sectionTitle: { ...type.titleLarge, color: colors.onSurface, fontSize: 18, marginBottom: 10 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.md, padding: 10 },
  memberName: { ...type.bodyMedium, color: colors.onSurface, fontSize: 14 },
});
