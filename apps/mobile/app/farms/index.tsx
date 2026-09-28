import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation, useStyles, type Colors } from "../../constants/theme";
import type { FarmProfile } from "../../constants/types";
import { useLiveRefresh } from "../../hooks/useLive";
import { AnimIn, PressableScale, Skeleton } from "../../components/motion";
import { Avatar, Chip, EmptyState, PageHeader } from "../../components/ui";
import { SmartImage } from "../../components/SmartImage";
import { Icon } from "../../components/Icon";

/** The farms whose produce goes into the boxes — read-only profiles. */
export default function FarmsScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [farms, setFarms] = useState<FarmProfile[] | null>(null);
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

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.surface }}
      data={farms ?? []}
      keyExtractor={(f) => f.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }}
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
          <PageHeader icon="potted_plant" eyebrow="Có tên, có mặt" title="Vườn rau" subtitle="Những nhà vườn ở Bắc Kạn và Tuyên Quang cùng trồng rau cho hộp của bạn" />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </>
      }
      ListEmptyComponent={
        farms === null ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={250} radius={shape.xl} />
            <Skeleton height={250} radius={shape.xl} />
          </View>
        ) : (
          <EmptyState icon="grass" title="Chưa có vườn nào" description="Các nhà vườn sẽ sớm xuất hiện ở đây." />
        )
      }
      renderItem={({ item, index }) => (
        <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 14 }}>
          <PressableScale style={[styles.card, elevation[1]]} onPress={() => router.push(`/farms/${item.slug}`)}>
            <View style={styles.media}>
              <SmartImage uri={item.cover_url} style={StyleSheet.absoluteFill} loaderSize={28} />
              <View style={styles.locChip}>
                <Icon name="location_on" size={12} filled color={colors.onImage} />
                <Text style={styles.locText} numberOfLines={1}>{item.province}</Text>
              </View>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.farmer ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <Avatar name={item.farmer} src={item.farmer_avatar} size={26} tone="tertiary" />
                  <Text style={styles.farmer} numberOfLines={1}>{item.farmer}</Text>
                </View>
              ) : null}
              {item.grows?.length ? (
                <View style={styles.grows}>
                  {item.grows.slice(0, 4).map((g) => (
                    <Chip key={g.produce_id} icon="eco" label={g.name} tone="primary" small />
                  ))}
                  {item.grows.length > 4 ? <Chip label={`+${item.grows.length - 4}`} small /> : null}
                </View>
              ) : item.description ? (
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
              ) : null}
            </View>
          </PressableScale>
        </AnimIn>
      )}
    />
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    errorText: { color: colors.error, marginBottom: 8 },
    card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, overflow: "hidden" },
    media: { height: 170, backgroundColor: colors.surfaceContainerHigh },
    locChip: { position: "absolute", left: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.imageScrim, borderRadius: shape.full, paddingVertical: 4, paddingHorizontal: 10 },
    locText: { color: colors.onImage, fontSize: 12, fontWeight: "600" },
    name: { ...type.titleMedium, color: colors.onSurface, fontSize: 17 },
    farmer: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 13, flex: 1 },
    grows: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
    description: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13, marginTop: 6 },
  });
