import { View, Text, StyleSheet } from "react-native";

export default function FarmsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vườn rau 🌱</Text>
      <Text style={styles.text}>Danh sách vườn — sẽ kết nối API</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6FBF4", padding: 24 },
  title: { fontSize: 22, fontWeight: "800", color: "#191C19", marginBottom: 8 },
  text: { fontSize: 14, color: "#404943" },
});
