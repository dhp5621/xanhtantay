import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useSession } from "../../hooks/useSession";
import { colors, shape, type } from "../../constants/theme";

export default function DangNhapScreen() {
  const { login } = useSession();
  const [role, setRole] = useState<"customer" | "farmer">("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const demoEmail = role === "customer" ? "lan@gmail.com" : "bacba@xanhtantay.vn";

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/tabs");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng nhập thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🌿</Text>
      <Text style={styles.title}>Xanh Tận Tay</Text>

      <View style={styles.roleToggle}>
        {(["customer", "farmer"] as const).map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRole(r)}
            style={[styles.roleBtn, role === r && styles.roleBtnActive]}
          >
            <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
              {r === "customer" ? "🛒 Khách hàng" : "🌾 Nông dân"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder={`Email (vd: ${demoEmail})`}
        placeholderTextColor={colors.onSurfaceVariant}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu (demo123)"
        placeholderTextColor={colors.onSurfaceVariant}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={[styles.btn, (submitting || !email || !password) && styles.btnDisabled]} onPress={onSubmit} disabled={submitting || !email || !password}>
        {submitting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.btnText}>Đăng nhập</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 28, justifyContent: "center" },
  logo: { fontSize: 40, textAlign: "center", marginBottom: 4 },
  title: { ...type.headlineSmall, color: colors.primary, textAlign: "center", marginBottom: 28 },
  roleToggle: { flexDirection: "row", backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.full, padding: 3, marginBottom: 20 },
  roleBtn: { flex: 1, padding: 10, borderRadius: shape.full, alignItems: "center" },
  roleBtnActive: { backgroundColor: colors.primary },
  roleBtnText: { ...type.labelLarge, color: colors.onSurfaceVariant },
  roleBtnTextActive: { color: colors.onPrimary },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: shape.sm,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
    color: colors.onSurface,
    borderBottomWidth: 2,
    borderBottomColor: colors.outline,
  },
  error: { color: colors.error, fontSize: 13, marginBottom: 8, textAlign: "center" },
  btn: { backgroundColor: colors.primary, borderRadius: shape.full, padding: 14, alignItems: "center", marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { ...type.labelLarge, color: colors.onPrimary, fontSize: 15 },
});
