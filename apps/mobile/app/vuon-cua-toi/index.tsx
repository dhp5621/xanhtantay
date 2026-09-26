import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation } from "../../constants/theme";
import { levelFor, LEVELS } from "../../constants/commerce";

interface Points {
  points: number;
  pendingPoints: number;
  level: string;
  trees: number;
}

export default function VuonCuaToiScreen() {
  const [data, setData] = useState<Points | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/users/points")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được dữ liệu"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{error ?? "Đăng nhập để xem vườn của bạn."}</Text>
      </View>
    );
  }

  const lv = levelFor(data.points);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={[styles.hero, elevation[2]]}>
        <Text style={{ fontSize: 56 }}>{lv.level.icon}</Text>
        <Text style={styles.heroEyebrow}>Hạng hiện tại</Text>
        <Text style={styles.heroTitle}>{lv.level.name}</Text>
        <Text style={styles.heroDesc}>{lv.level.desc}</Text>
        <Text style={styles.heroPoints}>{data.points} điểm</Text>
        {lv.next ? (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${lv.progress * 100}%` }]} />
            </View>
            <Text style={styles.heroNext}>
              Còn {lv.next.min - data.points} điểm nữa lên {lv.next.name}
              {data.pendingPoints > 0 ? ` · ${data.pendingPoints} điểm đang chờ đơn giao xong` : ""}
            </Text>
          </>
        ) : (
          <Text style={styles.heroNext}>Bạn đã ở hạng cao nhất. Cảm ơn vì đã nuôi cả khu vườn!</Text>
        )}
      </View>

      <View style={styles.statsGrid}>
        <StatTile icon="🌳" value={String(data.trees)} label="cây đã trồng" />
        <StatTile icon="⭐" value={String(data.pendingPoints)} label="điểm đang chờ" />
      </View>

      <Text style={styles.sectionTitle}>Các hạng</Text>
      {LEVELS.map((l, i) => (
        <View key={l.name} style={[styles.levelRow, i === lv.index && styles.levelRowActive]}>
          <Text style={{ fontSize: 22 }}>{l.icon}</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.levelName, i === lv.index && { color: colors.onPrimaryContainer }]}>{l.name}</Text>
            <Text style={[styles.levelDesc, i === lv.index && { color: colors.onPrimaryContainer }]}>{l.desc} · từ {l.min} điểm</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function StatTile({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  body: { ...type.bodyMedium, color: colors.onSurfaceVariant, textAlign: "center" },
  hero: { backgroundColor: colors.primaryContainer, borderRadius: shape.xlIncreased, padding: 24, alignItems: "center", marginBottom: 16 },
  heroEyebrow: { ...type.labelLarge, color: colors.onPrimaryContainer, opacity: 0.8, marginTop: 8 },
  heroTitle: { ...type.headlineSmall, color: colors.onPrimaryContainer, marginTop: 2 },
  heroDesc: { ...type.bodyMedium, color: colors.onPrimaryContainer, opacity: 0.85, marginTop: 2 },
  heroPoints: { ...type.titleLarge, color: colors.onPrimaryContainer, marginTop: 12 },
  progressTrack: { width: "100%", height: 8, backgroundColor: "rgba(0,0,0,.1)", borderRadius: shape.full, overflow: "hidden", marginTop: 10 },
  progressBar: { height: 8, backgroundColor: colors.primary, borderRadius: shape.full },
  heroNext: { ...type.bodyMedium, color: colors.onPrimaryContainer, textAlign: "center", marginTop: 8, fontSize: 12 },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statTile: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: shape.lg, padding: 14, alignItems: "flex-start" },
  statValue: { ...type.headlineSmall, color: colors.onSurface, marginTop: 4 },
  statLabel: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  sectionTitle: { ...type.titleLarge, color: colors.onSurface, marginBottom: 10 },
  levelRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.md, padding: 12, marginBottom: 8 },
  levelRowActive: { backgroundColor: colors.primaryContainer },
  levelName: { ...type.titleMedium, color: colors.onSurface, fontSize: 14 },
  levelDesc: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 11 },
});
