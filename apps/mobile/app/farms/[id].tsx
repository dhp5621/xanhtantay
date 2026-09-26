import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { Farm, Product } from "@xanhtantay/types";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation } from "../../constants/theme";

function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

export default function FarmDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([apiFetch(`/farms/${id}`), apiFetch(`/products?farm_id=${id}`)])
      .then(([farmRow, productRows]) => {
        setFarm(farmRow);
        setProducts(productRows);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được dữ liệu"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !farm) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Không tìm thấy vườn"}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={products}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View style={styles.header}>
          {farm.cover_url ? (
            <Image source={{ uri: farm.cover_url }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverFallback]}>
              <Text style={{ fontSize: 36 }}>🌾</Text>
            </View>
          )}
          <Text style={styles.name}>{farm.name}</Text>
          <Text style={styles.location}>{farm.location}</Text>
          {farm.description ? <Text style={styles.description}>{farm.description}</Text> : null}
          <Text style={styles.sectionTitle}>Nông sản</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Vườn chưa có sản phẩm nào.</Text>
        </View>
      }
      contentContainerStyle={{ paddingBottom: 24 }}
      renderItem={({ item }) => (
        <View style={[styles.productCard, elevation[1]]}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.productImageFallback]}>
              <Text style={{ fontSize: 22 }}>🥬</Text>
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productPrice}>
              {formatVnd(item.price_per_unit)} / {item.unit}
            </Text>
            {!item.in_stock || item.stock_qty <= 0 ? (
              <View style={styles.outOfStockChip}>
                <Text style={styles.outOfStockText}>Hết hàng</Text>
              </View>
            ) : null}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  errorText: { color: colors.error },
  header: { padding: 16 },
  cover: { width: "100%", height: 160, borderRadius: shape.xl, backgroundColor: colors.surfaceContainerHighest, marginBottom: 12 },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  name: { ...type.headlineSmall, color: colors.onSurface },
  location: { ...type.bodyLarge, color: colors.onSurfaceVariant, marginTop: 2 },
  description: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 8 },
  sectionTitle: { ...type.titleMedium, color: colors.onSurface, marginTop: 20, marginBottom: 4 },
  placeholder: { marginHorizontal: 16, padding: 20, backgroundColor: colors.surfaceContainer, borderRadius: shape.lg },
  placeholderText: { ...type.bodyMedium, color: colors.onSurfaceVariant },
  productCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: shape.lg,
    overflow: "hidden",
  },
  productImage: { width: 76, height: 76, backgroundColor: colors.surfaceContainerHighest },
  productImageFallback: { alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1, padding: 12, justifyContent: "center" },
  productName: { ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
  productPrice: { ...type.bodyMedium, color: colors.primary, marginTop: 2, fontWeight: "700" },
  outOfStockChip: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: shape.full,
    backgroundColor: colors.errorContainer,
  },
  outOfStockText: { fontSize: 11, fontWeight: "700", color: colors.onErrorContainer },
});
