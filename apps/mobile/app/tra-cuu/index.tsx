import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Image } from "react-native";
import { apiFetch, ApiError, API_URL } from "../../constants/api";
import { colors, shape, type } from "../../constants/theme";
import { formatVnd } from "../../constants/commerce";

const STATUS_LABEL: Record<string, string> = {
  harvesting: "Rau đang được nhà vườn thu hoạch 🌿",
  loaded: "Hàng đã lên xe lạnh về phố 🚚",
  delivered: "Đồ quê đã đến tận cửa nhà bạn 🏡",
};

interface TraceResult {
  id: string;
  status: string;
  created_at: string;
  farm: { name: string; location: string; cover_url?: string | null };
  items: { id: string; product_name?: string | null; product_unit?: string | null; quantity: number }[];
}

export default function TraCuuScreen() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TraceResult | null>(null);

  const lookup = async () => {
    const id = code.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // No dedicated JSON trace API on the web app (the /tra-cuu/[id] page renders server-side HTML),
      // so we ask for the order directly — this only works for the signed-in customer's own orders,
      // which is the common case for scanning a package they just received.
      const order = await apiFetch(`/orders/${id}`).catch(() => null);
      if (!order) throw new Error("Không tìm thấy gói rau với mã này");
      setResult(order);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Không tra cứu được");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={styles.title}>Tra cứu gói rau 🔍</Text>
      <Text style={styles.subtitle}>Nhập mã đơn hàng in trên tem QR để xem hành trình gói rau.</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Mã đơn hàng…"
          placeholderTextColor={colors.onSurfaceVariant}
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={lookup} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.searchBtnText}>Tra cứu</Text>}
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {result && (
        <View style={styles.resultCard}>
          {result.farm.cover_url ? <Image source={{ uri: result.farm.cover_url }} style={styles.cover} /> : null}
          <Text style={styles.farmName}>{result.farm.name}</Text>
          <Text style={styles.farmLocation}>{result.farm.location}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{STATUS_LABEL[result.status] ?? result.status}</Text>
          </View>
          <Text style={styles.blockLabel}>Trong gói này</Text>
          {result.items?.map((it) => (
            <Text key={it.id} style={styles.itemLine}>• {it.quantity} {it.product_unit} {it.product_name}</Text>
          ))}
          <Image source={{ uri: `${API_URL}/api/qr/${result.id}` }} style={styles.qr} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  title: { ...type.headlineSmall, color: colors.onSurface },
  subtitle: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 4, marginBottom: 16 },
  searchRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.md, padding: 12, color: colors.onSurface },
  searchBtn: { backgroundColor: colors.primary, borderRadius: shape.md, paddingHorizontal: 18, justifyContent: "center" },
  searchBtnText: { color: colors.onPrimary, fontWeight: "700" },
  errorText: { color: colors.error, marginTop: 12 },
  resultCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 18, marginTop: 20 },
  cover: { width: "100%", height: 140, borderRadius: shape.lg, marginBottom: 10, backgroundColor: colors.surfaceContainerHighest },
  farmName: { ...type.titleLarge, color: colors.onSurface },
  farmLocation: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 2 },
  statusBadge: { backgroundColor: colors.primaryContainer, borderRadius: shape.md, padding: 10, marginTop: 12 },
  statusBadgeText: { color: colors.onPrimaryContainer, fontWeight: "600", textAlign: "center" },
  blockLabel: { ...type.labelLarge, color: colors.onSurface, marginTop: 14, marginBottom: 4, textTransform: "uppercase", fontSize: 12 },
  itemLine: { ...type.bodyMedium, color: colors.onSurface, marginTop: 2 },
  qr: { width: 140, height: 140, alignSelf: "center", marginTop: 16, backgroundColor: "#fff", borderRadius: 12 },
});
