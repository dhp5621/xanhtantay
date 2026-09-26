import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import type { GroupOrder } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../../constants/api";
import { useSession } from "../../../hooks/useSession";
import { colors, shape, type, elevation } from "../../../constants/theme";

interface GroupMember { id: string; user_id: string; name: string | null }
type GroupDetail = GroupOrder & { members: GroupMember[]; joined: boolean };

function daysUntil(d: string | Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function GomDonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    apiFetch(`/groups/${id}`)
      .then((row: GroupDetail) => setGroup(row))
      .catch(() => setGroup(null))
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const join = async () => {
    if (!user) {
      Alert.alert("Cần đăng nhập", "Đăng nhập để tham gia nhóm gom đơn.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/groups/${id}/join`, { method: "POST", body: JSON.stringify({ items: [] }) });
      Alert.alert("Đã tham gia!", "Bạn đã ở trong nhóm gom đơn này. Rủ thêm hàng xóm để được freeship nhé.");
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
            Alert.alert("Đã rời nhóm", "Bạn có thể tham gia lại bất cứ lúc nào trước hạn chốt.");
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{group.title}</Text>

      <View style={[styles.statusCard, elevation[1], freeship && { backgroundColor: colors.primaryContainer }]}>
        <Text style={[styles.statusTitle, freeship && { color: colors.onPrimaryContainer }]}>
          {freeship ? "🎉 Đủ điều kiện freeship!" : `Cần thêm ${group.min_members - group.current_members} người nữa`}
        </Text>
        <Text style={[styles.statusMeta, freeship && { color: colors.onPrimaryContainer }]}>{group.current_members}/{group.min_members} người tham gia</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: freeship ? colors.primary : colors.secondary }]} />
        </View>
        <Text style={[styles.statusMeta, freeship && { color: colors.onPrimaryContainer }, { marginTop: 8 }]}>
          📍 {group.shipping_address}
        </Text>
        <Text style={[styles.statusMeta, freeship && { color: colors.onPrimaryContainer }]}>
          📅 {left > 0 ? `Còn ${left} ngày để chốt đơn` : "Chốt hôm nay"}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Thành viên ({group.members.length})</Text>
      {group.members.length === 0 ? (
        <Text style={styles.body}>Chưa có ai. Hãy là người đầu tiên!</Text>
      ) : (
        group.members.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <View style={[styles.memberAvatar, user && m.user_id === user.id && { backgroundColor: colors.primary }]}>
              <Text style={[styles.memberAvatarText, user && m.user_id === user.id && { color: colors.onPrimary }]}>
                {(m.name ?? "?").trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.memberName}>
              {m.name ?? "Thành viên ẩn danh"}
              {user && m.user_id === user.id ? " (bạn)" : ""}
            </Text>
          </View>
        ))
      )}

      {canAct && (
        <View style={{ marginTop: 20 }}>
          {group.joined ? (
            <TouchableOpacity style={styles.leaveBtn} disabled={busy} onPress={leave}>
              {busy ? <ActivityIndicator color={colors.error} /> : <Text style={styles.leaveBtnText}>Rời nhóm</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.joinBtn} disabled={busy} onPress={join}>
              {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.joinBtnText}>Tham gia nhóm</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  body: { ...type.bodyMedium, color: colors.onSurfaceVariant },
  title: { ...type.headlineSmall, color: colors.onSurface, marginBottom: 16 },
  statusCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xlIncreased, padding: 22, marginBottom: 20 },
  statusTitle: { ...type.titleLarge, color: colors.onSurface },
  statusMeta: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 4 },
  progressTrack: { height: 8, backgroundColor: "rgba(0,0,0,.08)", borderRadius: shape.full, overflow: "hidden", marginTop: 12 },
  progressBar: { height: 8, borderRadius: shape.full },
  sectionTitle: { ...type.titleMedium, color: colors.onSurface, marginBottom: 8 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  memberAvatar: { width: 32, height: 32, borderRadius: shape.full, backgroundColor: colors.surfaceContainerHighest, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { ...type.labelLarge, color: colors.onSurface, fontSize: 13 },
  memberName: { ...type.bodyMedium, color: colors.onSurface },
  joinBtn: { backgroundColor: colors.primary, borderRadius: shape.full, padding: 16, alignItems: "center" },
  joinBtnText: { ...type.labelLarge, color: colors.onPrimary, fontSize: 16 },
  leaveBtn: { borderWidth: 1.5, borderColor: colors.error, borderRadius: shape.full, padding: 16, alignItems: "center" },
  leaveBtnText: { ...type.labelLarge, color: colors.error, fontSize: 16 },
});
