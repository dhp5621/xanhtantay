import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useSession } from "../../../hooks/useSession";
import { colors, shape, type, elevation } from "../../../constants/theme";

const LINKS = [
  { href: "/tabs/farmer/don-hang", icon: "📦", title: "Đơn hàng", desc: "Xem đơn khách đặt và cập nhật trạng thái" },
  { href: "/tabs/farmer/san-pham", icon: "🥬", title: "Sản phẩm", desc: "Quản lý danh sách và tồn kho" },
  { href: "/tabs/farmer/nhat-ky", icon: "📓", title: "Nhật ký vườn", desc: "Đăng cập nhật để khách theo dõi vườn" },
] as const;

export default function FarmerHomeScreen() {
  const { user } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chào {user?.name ?? "bạn"} 🌾</Text>
      <Text style={styles.subtitle}>Khu vực dành cho nông dân</Text>

      {LINKS.map((l) => (
        <TouchableOpacity key={l.href} style={[styles.card, elevation[1]]} onPress={() => router.push(l.href)}>
          <Text style={styles.cardIcon}>{l.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{l.title}</Text>
            <Text style={styles.cardDesc}>{l.desc}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  title: { ...type.headlineSmall, color: colors.onSurface },
  subtitle: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 4, marginBottom: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: shape.lg,
    padding: 16,
    marginBottom: 12,
  },
  cardIcon: { fontSize: 28 },
  cardTitle: { ...type.titleMedium, color: colors.onSurface },
  cardDesc: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.onSurfaceVariant },
});
