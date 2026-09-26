import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image, RefreshControl } from "react-native";
import { router } from "expo-router";
import type { Farm } from "@xanhtantay/types";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation } from "../../constants/theme";

export default function FarmsScreen() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setFarms(await apiFetch("/farms"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vườn rau 🌱</Text>

      {loading && <ActivityIndicator color={colors.primary} />}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={farms}
        keyExtractor={(f) => f.id}
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
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Chưa có vườn nào.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, elevation[1]]} onPress={() => router.push(`/farms/${item.id}`)}>
            {item.cover_url ? (
              <Image source={{ uri: item.cover_url }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverFallback]}>
                <Text style={{ fontSize: 26 }}>🌾</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.location}>{item.location}</Text>
              {item.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, paddingTop: 24, paddingHorizontal: 16 },
  title: { ...type.headlineSmall, color: colors.onSurface, marginBottom: 16 },
  errorText: { color: colors.error, marginBottom: 8 },
  placeholder: { padding: 20, backgroundColor: colors.surfaceContainer, borderRadius: shape.lg },
  placeholderText: { ...type.bodyMedium, color: colors.onSurfaceVariant },
  card: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: shape.lg,
    overflow: "hidden",
  },
  cover: { width: 96, height: 96, backgroundColor: colors.surfaceContainerHighest },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, padding: 12, justifyContent: "center" },
  name: { ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
  location: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 2 },
  description: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 4, fontSize: 13 },
});
