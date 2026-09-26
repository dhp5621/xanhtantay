import { View, Text, TextInput, TouchableOpacity, StyleSheet, useState } from "react-native";

// TODO: Implement auth with API
export default function DangNhapScreen() {
  const [role, setRole] = useState<"customer" | "farmer">("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.btn}>
        <Text style={styles.btnText}>Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6FBF4", padding: 28, justifyContent: "center" },
  logo: { fontSize: 40, textAlign: "center", marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "800", color: "#1B6B3A", textAlign: "center", marginBottom: 28 },
  roleToggle: { flexDirection: "row", backgroundColor: "#DEE4DC", borderRadius: 24, padding: 3, marginBottom: 20 },
  roleBtn: { flex: 1, padding: 10, borderRadius: 20, alignItems: "center" },
  roleBtnActive: { backgroundColor: "#1B6B3A" },
  roleBtnText: { fontSize: 13, fontWeight: "600", color: "#404943" },
  roleBtnTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#EAF0E8",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#707973",
  },
  btn: { backgroundColor: "#1B6B3A", borderRadius: 24, padding: 14, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
