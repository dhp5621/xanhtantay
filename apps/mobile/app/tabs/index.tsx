import { View, Text, ScrollView, StyleSheet } from "react-native";

// TODO: Connect to API at process.env.EXPO_PUBLIC_API_URL
export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Xanh Tận Tay 🌿</Text>
        <Text style={styles.subtitle}>Nông sản tươi từ vườn đến tay bạn</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Màn hình trang chủ — sẽ hiển thị vườn nổi bật, nhật ký vườn và nhóm gom đơn
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6FBF4" },
  hero: { padding: 24, backgroundColor: "#A8F5BE", margin: 16, borderRadius: 16 },
  title: { fontSize: 24, fontWeight: "800", color: "#002110", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#004020" },
  placeholder: {
    margin: 16,
    padding: 20,
    backgroundColor: "#EAF0E8",
    borderRadius: 12,
  },
  placeholderText: { fontSize: 14, color: "#404943", lineHeight: 22 },
});
