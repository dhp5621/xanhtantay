import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { apiFetch, ApiError } from "../../../constants/api";
import { colors, shape, type } from "../../../constants/theme";

const SUGGESTIONS = [
  "Hôm nay thu hoạch được lứa rau xanh mướt.",
  "Gieo hạt đợt mới, khoảng 3 tuần nữa có hàng.",
  "Tưới nước buổi sáng, thời tiết thuận lợi cho rau lớn.",
  "Cây đang ra hoa, sắp có trái ngon cho các bạn.",
];

export default function NhatKyScreen() {
  const [farm, setFarm] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useFocusEffect(
    useCallback(() => {
      apiFetch("/farms/mine")
        .then(setFarm)
        .catch(() => setFarm(null));
    }, [])
  );

  const submit = async () => {
    if (!content.trim() || !farm) return;
    setSubmitting(true);
    try {
      await apiFetch(`/farms/${farm.id}/diary`, { method: "POST", body: JSON.stringify({ content: content.trim(), media_urls: [] }) });
      setContent("");
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      Alert.alert("Không đăng được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  if (farm === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (farm === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Tài khoản này chưa có vườn nên chưa thể đăng nhật ký.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nhật ký vườn 📓</Text>
      <Text style={styles.subtitle}>Hôm nay ở vườn có gì hay? Chia sẻ cùng khách hàng nhé.</Text>

      <TextInput
        style={styles.textarea}
        multiline
        numberOfLines={6}
        maxLength={1000}
        placeholder="Viết vài dòng…"
        placeholderTextColor={colors.onSurfaceVariant}
        value={content}
        onChangeText={setContent}
      />
      <Text style={styles.counter}>{content.length}/1000</Text>

      <Text style={styles.suggestLabel}>Gợi ý nhanh</Text>
      <View style={styles.suggestRow}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity key={s} style={styles.suggestChip} onPress={() => setContent(s)}>
            <Text style={styles.suggestChipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {done && (
        <View style={styles.doneBanner}>
          <Text style={styles.doneBannerText}>✅ Đã đăng nhật ký thành công!</Text>
        </View>
      )}

      <TouchableOpacity style={styles.submitBtn} disabled={submitting || !content.trim()} onPress={submit}>
        {submitting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.submitBtnText}>Đăng lên {farm.name}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  body: { ...type.bodyMedium, color: colors.onSurfaceVariant, textAlign: "center" },
  title: { ...type.headlineSmall, color: colors.onSurface },
  subtitle: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 4, marginBottom: 16 },
  textarea: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: shape.lg,
    padding: 14,
    color: colors.onSurface,
    minHeight: 120,
    textAlignVertical: "top",
  },
  counter: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 11, textAlign: "right", marginTop: 4 },
  suggestLabel: { ...type.labelLarge, color: colors.onSurface, marginTop: 16, marginBottom: 8 },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestChip: { backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.full, paddingVertical: 8, paddingHorizontal: 12, maxWidth: "100%" },
  suggestChipText: { color: colors.onSurface, fontSize: 12 },
  doneBanner: { backgroundColor: colors.primaryContainer, borderRadius: shape.md, padding: 12, marginTop: 16 },
  doneBannerText: { color: colors.onPrimaryContainer, fontWeight: "700" },
  submitBtn: { backgroundColor: colors.primary, borderRadius: shape.full, padding: 16, alignItems: "center", marginTop: 20 },
  submitBtnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 15 },
});
