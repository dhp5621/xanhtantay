import { useState } from "react";
import { View, Text, StyleSheet, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, elevation } from "../../constants/theme";
import { formatDateTime } from "../../constants/format";
import { AnimIn, AnimInScale, PressableScale } from "../../components/motion";
import { PageHeader } from "../../components/ui";
import { QrImage } from "../../components/QrImage";
import { Icon } from "../../components/Icon";

const STATUS_LABEL: Record<string, string> = {
  harvesting: "Rau đang được nhà vườn thu hoạch 🌿",
  loaded: "Hàng đã lên xe lạnh về phố 🚚",
  delivered: "Đồ quê đã đến tận cửa nhà bạn 🏡",
};
const STEPS = ["harvesting", "loaded", "delivered"];

interface TraceResult {
  id: string;
  status: string;
  created_at: string;
  farm: { name: string; location: string; cover_url?: string | null };
  items: { id: string; product_name?: string | null; product_unit?: string | null; quantity: number }[];
}

/** Mirrors apps/web/src/app/tra-cuu/[id] — the public package trace a QR sticker opens. */
export default function TraCuuScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const [code, setCode] = useState(params.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TraceResult | null>(null);

  const lookup = async () => {
    // Accept a pasted trace URL as well as the bare order id.
    const id = code.trim().split("/").filter(Boolean).pop() ?? "";
    if (!id) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await apiFetch(`/orders/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tra cứu được");
    } finally {
      setLoading(false);
    }
  };

  const stepIdx = result ? STEPS.indexOf(result.status) : -1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <PageHeader icon="search" eyebrow="Quét là biết" title="Tra cứu gói rau" subtitle="Nhập mã đơn hàng in trên tem QR để xem hành trình gói rau." />

      <AnimIn>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Mã đơn hàng hoặc link tem…"
            placeholderTextColor={colors.onSurfaceVariant}
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={lookup}
          />
          <PressableScale haptic style={styles.searchBtn} onPress={lookup} disabled={loading || !code.trim()}>
            {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.searchBtnText}>Tra cứu</Text>}
          </PressableScale>
        </View>
      </AnimIn>

      {error && (
        <AnimIn>
          <Text style={styles.errorText}>{error}</Text>
        </AnimIn>
      )}

      {result && (
        <AnimInScale>
          <View style={[styles.resultCard, elevation[1]]}>
            {result.farm.cover_url ? <Image source={{ uri: result.farm.cover_url }} style={styles.cover} contentFit="cover" transition={300} /> : null}
            <Text style={styles.farmName}>{result.farm.name}</Text>
            <Text style={styles.body}>📍 {result.farm.location}</Text>

            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{STATUS_LABEL[result.status] ?? result.status}</Text>
            </View>

            <View style={styles.stepsRow}>
              {STEPS.map((s, i) => (
                <View key={s} style={{ flex: 1, alignItems: "center" }}>
                  <View style={[styles.stepDot, i <= stepIdx && styles.stepDotDone]}>
                    <Icon name={["agriculture", "local_shipping", "home"][i]} size={18} filled color={i <= stepIdx ? colors.onPrimaryContainer : colors.onSurfaceVariant} />
                  </View>
                  <Text style={[styles.stepLabel, i <= stepIdx && { color: colors.primary, fontWeight: "700" }]}>{["Thu hoạch", "Lên xe", "Đã giao"][i]}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.blockLabel}>TRONG GÓI NÀY</Text>
            {result.items?.map((it) => (
              <Text key={it.id} style={styles.itemLine}>
                • {it.quantity} {it.product_unit} {it.product_name}
              </Text>
            ))}
            <Text style={[styles.body, { marginTop: 10 }]}>Đặt lúc {formatDateTime(result.created_at)} · Mã #{result.id.slice(0, 8).toUpperCase()}</Text>

            <View style={{ alignItems: "center", marginTop: 16 }}>
              <QrImage orderId={result.id} size={150} />
              <Text style={[styles.body, { marginTop: 8 }]}>Quét mã để xem vườn, nhật ký và hành trình gói rau.</Text>
            </View>
          </View>
        </AnimInScale>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },
  searchRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.full, paddingHorizontal: 18, paddingVertical: 13, color: colors.onSurface, borderWidth: 1, borderColor: colors.outlineVariant },
  searchBtn: { backgroundColor: colors.primary, borderRadius: shape.full, paddingHorizontal: 20, justifyContent: "center" },
  searchBtnText: { ...type.labelLarge, color: colors.onPrimary },
  errorText: { color: colors.error, marginTop: 12 },
  resultCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 18, marginTop: 20 },
  cover: { width: "100%", height: 150, borderRadius: shape.lg, marginBottom: 12, backgroundColor: colors.surfaceContainerHighest },
  farmName: { ...type.titleLarge, color: colors.onSurface },
  statusBadge: { backgroundColor: colors.primaryContainer, borderRadius: shape.md, padding: 12, marginTop: 14 },
  statusBadgeText: { color: colors.onPrimaryContainer, fontWeight: "700", textAlign: "center" },
  stepsRow: { flexDirection: "row", marginTop: 14 },
  stepDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceContainerHighest, alignItems: "center", justifyContent: "center" },
  stepDotDone: { backgroundColor: colors.primaryContainer },
  stepLabel: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 4 },
  blockLabel: { ...type.labelLarge, color: colors.onSurfaceVariant, marginTop: 16, marginBottom: 4, fontSize: 11, letterSpacing: 0.6 },
  itemLine: { ...type.bodyMedium, color: colors.onSurface, marginTop: 2, fontSize: 14 },
});
