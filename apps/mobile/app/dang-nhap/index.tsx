import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSession } from "../../hooks/useSession";
import { colors, shape, type, emojiFont, useStyles } from "../../constants/theme";
import { AnimIn, AnimInScale, HeroBlob, PressableScale } from "../../components/motion";
import { Screen } from "../../components/ui";
import { Icon } from "../../components/Icon";
import type { Colors } from "../../constants/theme";
import { Loader } from "../../components/Loader";

/** Demo accounts advertised on the web login page (apps/web/src/lib/auth.ts). Password for both: demo123. */
const DEMO = {
  customer: { email: "lan@gmail.com", name: "Nguyễn Thị Lan" },
  farmer: { email: "bacba@xanhtantay.vn", name: "Bác Ba Nguyễn" },
} as const;

export default function DangNhapScreen() {
  const styles = useStyles(makeStyles);
  const { login } = useSession();
  const params = useLocalSearchParams<{ role?: string; next?: string }>();
  const [role, setRole] = useState<"customer" | "farmer">(params.role === "farmer" ? "farmer" : "customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const demo = DEMO[role];

  async function onSubmit(e = email, p = password) {
    setError(null);
    setSubmitting(true);
    try {
      await login(e.trim(), p);
      const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/tabs";
      router.replace(next as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <AnimInScale style={styles.hero}>
            <HeroBlob size={220} right={-70} top={-90} />
            <HeroBlob size={140} right={120} top={90} delay={1500} color="rgba(255,255,255,.18)" />
            <Icon name="eco" size={52} filled color={colors.primary} />
            <Text style={styles.title}>Xanh Tận Tay</Text>
            <Text style={styles.tagline}>Rau tươi gom thẳng từ vườn, có tên người trồng</Text>
          </AnimInScale>

          <AnimIn delay={80}>
            <View style={styles.roleToggle}>
              {(["customer", "farmer"] as const).map((r) => (
                <TouchableOpacity key={r} onPress={() => setRole(r)} style={[styles.roleBtn, role === r && styles.roleBtnActive]}>
                  <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>{r === "customer" ? "Khách hàng" : "Nhà vườn"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </AnimIn>

          <AnimIn delay={140}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.onSurfaceVariant}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu"
              placeholderTextColor={colors.onSurfaceVariant}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              onSubmitEditing={() => email && password && onSubmit()}
            />
          </AnimIn>

          {error && (
            <AnimIn>
              <Text style={styles.error}>{error}</Text>
            </AnimIn>
          )}

          <AnimIn delay={200}>
            <PressableScale haptic style={[styles.btn, (submitting || !email || !password) && styles.btnDisabled]} onPress={() => onSubmit()} disabled={submitting || !email || !password}>
              {submitting ? <Loader size={22} color={colors.onPrimary} /> : <Text style={styles.btnText}>Đăng nhập</Text>}
            </PressableScale>

            <View style={styles.demoCard}>
              <Text style={styles.demoTitle}>Dùng thử không cần đăng ký</Text>
              <Text style={styles.demoBody}>
                Tài khoản {role === "customer" ? "khách" : "nhà vườn"} demo: <Text style={{ fontWeight: "700" }}>{demo.email}</Text> · mật khẩu <Text style={{ fontWeight: "700" }}>demo123</Text>
              </Text>
              <PressableScale
                style={styles.demoBtn}
                disabled={submitting}
                onPress={() => {
                  setEmail(demo.email);
                  setPassword("demo123");
                  onSubmit(demo.email, "demo123");
                }}
              >
                <Text style={styles.demoBtnText}>{role === "customer" ? "Vào với tài khoản khách" : "Vào với tài khoản nhà vườn"}</Text>
              </PressableScale>
            </View>
          </AnimIn>

          <TouchableOpacity onPress={() => router.replace("/tabs")} style={{ alignSelf: "center", padding: 12 }}>
            <Text style={styles.skip}>Xem trước không đăng nhập →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { padding: 24, paddingTop: 12, flexGrow: 1, justifyContent: "center" },
  hero: { backgroundColor: colors.primaryContainer, borderRadius: shape.xlIncreased, padding: 28, alignItems: "center", overflow: "hidden", marginBottom: 20 },
  logo: { fontSize: 44 },
  title: { ...emojiFont,  ...type.headlineSmall, color: colors.onPrimaryContainer, fontSize: 26, marginTop: 4 },
  tagline: { ...type.bodyMedium, color: colors.onPrimaryContainer, opacity: 0.85, textAlign: "center", marginTop: 4 },
  roleToggle: { flexDirection: "row", backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.full, padding: 3, marginBottom: 16 },
  roleBtn: { flex: 1, padding: 11, borderRadius: shape.full, alignItems: "center" },
  roleBtnActive: { backgroundColor: colors.primary },
  roleBtnText: { ...type.labelLarge, color: colors.onSurfaceVariant },
  roleBtnTextActive: { color: colors.onPrimary },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: shape.md,
    padding: 15,
    marginBottom: 12,
    fontSize: 15,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  error: { color: colors.error, fontSize: 13, marginBottom: 8, textAlign: "center" },
  btn: { backgroundColor: colors.primary, borderRadius: shape.full, padding: 15, alignItems: "center", marginTop: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { ...type.labelLarge, color: colors.onPrimary, fontSize: 15 },
  demoCard: { marginTop: 18, backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 16 },
  demoTitle: { ...type.titleMedium, color: colors.onSurface, fontSize: 14 },
  demoBody: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 },
  demoBtn: { marginTop: 12, backgroundColor: colors.secondaryContainer, borderRadius: shape.full, paddingVertical: 11, alignItems: "center" },
  demoBtnText: { ...type.labelLarge, color: colors.onSecondaryContainer, fontSize: 13 },
  skip: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 13, marginTop: 6 },
});
