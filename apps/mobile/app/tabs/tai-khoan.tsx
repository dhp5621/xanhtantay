import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSession } from "../../hooks/useSession";
import { colors, shape, type, elevation } from "../../constants/theme";

const CUSTOMER_LINKS = [
  { href: "/vuon-cua-toi", icon: "🌳", title: "Vườn của tôi", desc: "Điểm tích luỹ và hạng của bạn" },
  { href: "/dinh-ky", icon: "🔄", title: "Đơn định kỳ", desc: "Quản lý gói giao hàng lặp lại" },
  { href: "/cong-thuc", icon: "🍲", title: "Công thức nấu ăn", desc: "Gợi ý món ăn từ rau bạn vừa nhận" },
  { href: "/tra-cuu", icon: "🔍", title: "Tra cứu gói rau", desc: "Xem hành trình một gói rau" },
] as const;

export default function TaiKhoanScreen() {
  const { user, loading, logout } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tài khoản</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push("/dang-nhap")}>
          <Text style={styles.loginBtnText}>Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <View style={[styles.profile, elevation[1]]}>
        {user.image ? (
          <Image source={{ uri: user.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{(user.name ?? "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.roleChip}>
          <Text style={styles.roleChipText}>{user.role === "farmer" ? "🌾 Nông dân" : "🛒 Khách hàng"}</Text>
        </View>
      </View>

      {user.role !== "farmer" &&
        CUSTOMER_LINKS.map((l) => (
          <TouchableOpacity key={l.href} style={styles.linkCard} onPress={() => router.push(l.href)}>
            <Text style={{ fontSize: 24 }}>{l.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>{l.title}</Text>
              <Text style={styles.linkDesc}>{l.desc}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}

      <TouchableOpacity
        style={styles.logoutBtn}
        disabled={signingOut}
        onPress={async () => {
          setSigningOut(true);
          await logout();
          setSigningOut(false);
        }}
      >
        {signingOut ? <ActivityIndicator color={colors.error} /> : <Text style={styles.logoutBtnText}>Đăng xuất</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 24 },
  title: { ...type.titleLarge, color: colors.onSurface, marginBottom: 24 },
  profile: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 32,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shape.xl,
    padding: 24,
  },
  avatar: { width: 88, height: 88, borderRadius: shape.full, marginBottom: 12, backgroundColor: colors.surfaceContainerHighest },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryContainer },
  avatarInitial: { fontSize: 32, fontWeight: "800", color: colors.onPrimaryContainer },
  name: { ...type.titleLarge, color: colors.onSurface },
  email: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 2 },
  roleChip: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: shape.full,
    backgroundColor: colors.secondaryContainer,
  },
  roleChipText: { ...type.labelLarge, color: colors.onSecondaryContainer, fontSize: 13 },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: shape.lg,
    padding: 16,
    marginBottom: 12,
  },
  linkTitle: { ...type.titleMedium, color: colors.onSurface, fontSize: 14 },
  linkDesc: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 2 },
  chevron: { fontSize: 20, color: colors.onSurfaceVariant },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: shape.full,
    padding: 14,
    alignItems: "center",
  },
  loginBtnText: { ...type.labelLarge, color: colors.onPrimary, fontSize: 15 },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: shape.full,
    padding: 14,
    alignItems: "center",
  },
  logoutBtnText: { ...type.labelLarge, color: colors.error, fontSize: 15 },
});
