import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import type { Farm } from "@xanhtantay/types";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation } from "../../constants/theme";
import { AnimIn, PressableScale, Skeleton } from "../../components/motion";
import { EmptyState, PageHeader, Screen } from "../../components/ui";
import { Icon } from "../../components/Icon";

export default function FarmsScreen() {
  const [farms, setFarms] = useState<Farm[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setFarms(await apiFetch("/farms"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
      setFarms((f) => f ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <FlatList
        data={farms ?? []}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
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
        ListHeaderComponent={
          <>
            <PageHeader icon="potted_plant" eyebrow="Có tên, có mặt" title="Vườn rau" subtitle="Những nhà vườn đang bán trực tiếp cho bạn" />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </>
        }
        ListEmptyComponent={
          farms === null ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={230} radius={shape.xl} />
              <Skeleton height={230} radius={shape.xl} />
            </View>
          ) : (
            <EmptyState icon="grass" title="Chưa có vườn nào" description="Các nhà vườn sẽ sớm xuất hiện ở đây." />
          )
        }
        renderItem={({ item, index }) => (
          <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 14 }}>
            <PressableScale style={[styles.card, elevation[1]]} onPress={() => router.push(`/farms/${item.id}`)}>
              <View style={styles.media}>
                {item.cover_url ? <Image source={{ uri: item.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" }]}><Icon name="agriculture" size={40} /></View>}
                <View style={styles.locChip}>
                  <Text style={styles.locText}><Icon name="location_on" size={12} filled color="#fff" /> {item.location}</Text>
                </View>
              </View>
              <View style={{ padding: 16 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.description ? <Text style={styles.description} numberOfLines={2}>{item.description}</Text> : null}
              </View>
            </PressableScale>
          </AnimIn>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  errorText: { color: colors.error, marginBottom: 8 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, overflow: "hidden" },
  media: { height: 170, position: "relative", backgroundColor: colors.surfaceContainerHigh },
  locChip: { position: "absolute", left: 12, bottom: 12, backgroundColor: "rgba(0,0,0,.55)", borderRadius: shape.full, paddingVertical: 4, paddingHorizontal: 10 },
  locText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  name: { ...type.titleMedium, color: colors.onSurface, fontSize: 17, marginBottom: 3 },
  description: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },
});
