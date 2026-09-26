import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { GroupOrder } from "@xanhtantay/types";
import { apiFetch } from "../../../constants/api";
import { colors, shape, type, elevation } from "../../../constants/theme";

function daysUntil(d: string | Date) {
  const ms = new Date(d).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function GomDonScreen() {
  const [groups, setGroups] = useState<GroupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroups(await apiFetch("/groups"));
    } catch {
      // ignore; empty state covers it
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Gom đơn chung 🤝</Text>
        <Text style={styles.subtitle}>Rủ hàng xóm cùng mua để chia ship. Freeship khi nhóm đủ người.</Text>
      </View>
      {loading && <ActivityIndicator color={colors.primary} />}
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[colors.primary]} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Chưa có nhóm gom đơn nào. Hãy là người đầu tiên tạo nhóm cho khu của bạn.</Text>
            </View>
          ) : null
        }
        renderItem={({ item: g }) => {
          const pct = Math.min(100, Math.round((g.current_members / g.min_members) * 100));
          const freeship = g.current_members >= g.min_members;
          const left = daysUntil(g.deadline);
          return (
            <TouchableOpacity style={[styles.card, elevation[1]]} onPress={() => router.push(`/tabs/gom-don/${g.id}`)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{g.title}</Text>
                {freeship ? (
                  <View style={[styles.chip, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={[styles.chipText, { color: colors.onPrimaryContainer }]}>Freeship</Text>
                  </View>
                ) : (
                  <View style={[styles.chip, { backgroundColor: colors.surfaceContainerHighest }]}>
                    <Text style={[styles.chipText, { color: colors.onSurfaceVariant }]}>Thiếu {g.min_members - g.current_members}</Text>
                  </View>
                )}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: freeship ? colors.primary : colors.secondary }]} />
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta} numberOfLines={1}>{g.current_members}/{g.min_members} người · {g.shipping_address}</Text>
                <Text style={[styles.cardDeadline, left <= 1 && { color: colors.error }]}>{left > 0 ? `Còn ${left} ngày` : "Chốt hôm nay"}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerRow: { padding: 16, paddingBottom: 0 },
  title: { ...type.headlineSmall, color: colors.onSurface },
  subtitle: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 4 },
  placeholder: { padding: 20, backgroundColor: colors.surfaceContainer, borderRadius: shape.lg },
  placeholderText: { ...type.bodyMedium, color: colors.onSurfaceVariant },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 18, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 },
  cardTitle: { ...type.titleMedium, color: colors.onSurface, flex: 1 },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: shape.full },
  chipText: { fontSize: 11, fontWeight: "700" },
  progressTrack: { height: 6, backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.full, overflow: "hidden" },
  progressBar: { height: 6, borderRadius: shape.full },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 8 },
  cardMeta: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, flex: 1 },
  cardDeadline: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, fontWeight: "700" },
});
