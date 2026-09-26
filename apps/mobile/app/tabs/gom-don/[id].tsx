import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import type { GroupOrder } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../../constants/api";
import { useSession } from "../../../hooks/useSession";
import { colors, shape, type, elevation } from "../../../constants/theme";

function daysUntil(d: string | Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function GomDonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [group, setGroup] = useState<GroupOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      apiFetch("/groups")
        .then((rows: GroupOrder[]) => setGroup(rows.find((g) => g.id === id) ?? null))
        .catch(() => setGroup(null))
        .finally(() => setLoading(false));
    }, [id])
  );

  const join = async () => {
    if (!user) {
      Alert.alert("Cần đăng nhập", "Đăng nhập để tham gia nhóm gom đơn.");
      return;
    }
    setJoining(true);
    try {
      await apiFetch(`/groups/${id}/join`, { method: "POST", body: JSON.stringify({ items: [] }) });
      setJoined(true);
      setGroup((g) => (g ? { ...g, current_members: g.current_members + 1 } : g));
      Alert.alert("Đã tham gia!", "Bạn đã ở trong nhóm gom đơn này.");
    } catch (e) {
      Alert.alert("Không tham gia được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setJoining(false);
    }
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

      {group.status === "open" && left >= 0 && (
        <TouchableOpacity style={[styles.joinBtn, joined && styles.joinedBtn]} disabled={joining || joined} onPress={join}>
          {joining ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.joinBtnText}>{joined ? "Đã tham gia ✓" : "Tham gia nhóm"}</Text>}
        </TouchableOpacity>
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
  joinBtn: { backgroundColor: colors.primary, borderRadius: shape.full, padding: 16, alignItems: "center" },
  joinedBtn: { backgroundColor: colors.surfaceContainerHighest },
  joinBtnText: { ...type.labelLarge, color: colors.onPrimary, fontSize: 16 },
});
