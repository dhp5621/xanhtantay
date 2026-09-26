import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function TaiKhoanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tài khoản</Text>
      <TouchableOpacity style={styles.loginBtn}>
        <Text style={styles.loginBtnText}>Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6FBF4", padding: 24 },
  title: { fontSize: 22, fontWeight: "800", color: "#191C19", marginBottom: 24 },
  loginBtn: {
    backgroundColor: "#1B6B3A",
    borderRadius: 24,
    padding: 14,
    alignItems: "center",
  },
  loginBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
