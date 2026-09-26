import { View, Text, StyleSheet } from "react-native";

export default function DonHangScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đơn hàng 📦</Text>
      <Text style={styles.text}>
        Theo dõi đơn hàng với trạng thái cảm xúc — sẽ kết nối API
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6FBF4", padding: 24 },
  title: { fontSize: 22, fontWeight: "800", color: "#191C19", marginBottom: 8 },
  text: { fontSize: 14, color: "#404943", lineHeight: 22 },
});
