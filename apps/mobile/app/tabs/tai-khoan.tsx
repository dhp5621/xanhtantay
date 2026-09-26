import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useSession } from "../../hooks/useSession";
import { colors, shape, type, elevation } from "../../constants/theme";

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
    <View style={styles.container}>
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
    </View>
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
