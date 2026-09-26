import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Image, RefreshControl } from "react-native";
import { router } from "expo-router";
import type { Farm } from "@xanhtantay/types";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation } from "../../constants/theme";

export default function HomeScreen() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await apiFetch("/farms");
      setFarms(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.title}>Xanh Tận Tay 🌿</Text>
        <Text style={styles.subtitle}>Nông sản tươi từ vườn đến tay bạn</Text>
      </View>

      <Text style={styles.sectionTitle}>Vườn nổi bật</Text>

      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {!loading && !error && farms.length === 0 && (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Chưa có vườn nào.</Text>
        </View>
      )}

      {farms.slice(0, 8).map((farm) => (
        <TouchableOpacity
          key={farm.id}
          style={[styles.farmCard, elevation[1]]}
          onPress={() => router.push(`/farms/${farm.id}`)}
        >
          {farm.cover_url ? (
            <Image source={{ uri: farm.cover_url }} style={styles.farmCover} />
          ) : (
            <View style={[styles.farmCover, styles.farmCoverFallback]}>
              <Text style={{ fontSize: 28 }}>🌱</Text>
            </View>
          )}
          <View style={styles.farmInfo}>
            <Text style={styles.farmName}>{farm.name}</Text>
            <Text style={styles.farmLocation}>{farm.location}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { padding: 24, backgroundColor: colors.primaryContainer, margin: 16, borderRadius: shape.xl },
  title: { ...type.headlineSmall, color: colors.onPrimaryContainer, marginBottom: 4 },
  subtitle: { ...type.bodyLarge, color: colors.onPrimaryContainer },
  sectionTitle: { ...type.titleMedium, color: colors.onSurface, marginHorizontal: 16, marginBottom: 8 },
  errorText: { color: colors.error, marginHorizontal: 16 },
  placeholder: {
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: colors.surfaceContainer,
    borderRadius: shape.lg,
  },
  placeholderText: { ...type.bodyMedium, color: colors.onSurfaceVariant },
  farmCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: shape.lg,
    overflow: "hidden",
  },
  farmCover: { width: 84, height: 84, backgroundColor: colors.surfaceContainerHighest },
  farmCoverFallback: { alignItems: "center", justifyContent: "center" },
  farmInfo: { flex: 1, padding: 12, justifyContent: "center" },
  farmName: { ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
  farmLocation: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 2 },
});
