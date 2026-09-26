import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import type { Farm, Product, FarmDiaryEntry } from "@xanhtantay/types";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation } from "../../constants/theme";
import { useCart } from "../../hooks/useCart";
import { formatVnd } from "../../constants/commerce";

export default function FarmDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [diary, setDiary] = useState<FarmDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cart = useCart();

  useEffect(() => {
    if (!id) return;
    Promise.all([apiFetch(`/farms/${id}`), apiFetch(`/products?farm_id=${id}`), apiFetch(`/farms/${id}/diary`).catch(() => [])])
      .then(([farmRow, productRows, diaryRows]) => {
        setFarm(farmRow);
        setProducts(productRows);
        setDiary(diaryRows ?? []);
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
    <View style={{ flex: 1 }}>
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
      ListFooterComponent={
        diary.length > 0 ? (
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <Text style={styles.sectionTitle}>Nhật ký vườn</Text>
            {diary.map((d) => (
              <View key={d.id} style={styles.diaryCard}>
                {d.media_urls?.[0] ? <Image source={{ uri: d.media_urls[0] }} style={styles.diaryImage} /> : null}
                <Text style={styles.diaryContent}>{d.content}</Text>
                <Text style={styles.diaryDate}>{new Date(d.created_at).toLocaleDateString("vi-VN")}</Text>
              </View>
            ))}
          </View>
        ) : null
      }
      contentContainerStyle={{ paddingBottom: 100 }}
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
            ) : (
              <CartStepper
                qty={cart.qtyOf(item.id)}
                onAdd={() =>
                  cart.add({
                    id: item.id,
                    name: item.name,
                    unit: item.unit,
                    price_per_unit: item.price_per_unit,
                    farm_id: farm.id,
                    farm_name: farm.name,
                    farm_slug: farm.slug,
                    farm_location: farm.location,
                  })
                }
                onSetQty={(n) => cart.setQty(item.id, n)}
              />
            )}
          </View>
        </View>
      )}
    />
    {cart.count > 0 && (
      <TouchableOpacity style={styles.cartBar} onPress={() => router.push("/cart")}>
        <Text style={styles.cartBarText}>🧺 {cart.count} món · {formatVnd(cart.total)}</Text>
        <Text style={styles.cartBarCta}>Xem giỏ →</Text>
      </TouchableOpacity>
    )}
    </View>
  );
}

function CartStepper({ qty, onAdd, onSetQty }: { qty: number; onAdd: () => void; onSetQty: (n: number) => void }) {
  if (qty === 0) {
    return (
      <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
        <Text style={styles.addBtnText}>+ Thêm</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity style={styles.stepperBtn} onPress={() => onSetQty(qty - 1)}>
        <Text style={styles.stepperBtnText}>{qty === 1 ? "✕" : "–"}</Text>
      </TouchableOpacity>
      <Text style={styles.stepperQty}>{qty}</Text>
      <TouchableOpacity style={styles.stepperBtn} onPress={onAdd}>
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
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
  addBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.primaryContainer,
    borderRadius: shape.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  addBtnText: { fontSize: 12, fontWeight: "700", color: colors.onPrimaryContainer },
  stepperRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primaryContainer,
    borderRadius: shape.full,
  },
  stepperBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  stepperBtnText: { fontSize: 15, fontWeight: "700", color: colors.onPrimaryContainer },
  stepperQty: { minWidth: 20, textAlign: "center", fontWeight: "700", color: colors.onPrimaryContainer },
  cartBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.primary,
    borderRadius: shape.full,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartBarText: { color: colors.onPrimary, fontWeight: "700" },
  cartBarCta: { color: colors.onPrimary, fontWeight: "700" },
  diaryCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 14, marginBottom: 10 },
  diaryImage: { width: "100%", height: 140, borderRadius: shape.md, marginBottom: 8, backgroundColor: colors.surfaceContainerHighest },
  diaryContent: { ...type.bodyMedium, color: colors.onSurface },
  diaryDate: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 6 },
});
