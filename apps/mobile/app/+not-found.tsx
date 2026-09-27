import { View, Text, StyleSheet } from "react-native";
import { Link, Stack } from "expo-router";
import { colors, shape, type, emojiFont, useStyles } from "../constants/theme";
import { AnimInScale } from "../components/motion";
import { Icon } from "../components/Icon";
import type { Colors } from "../constants/theme";

export default function NotFoundScreen() {
  const styles = useStyles(makeStyles);
  return (
    <>
      <Stack.Screen options={{ title: "Không tìm thấy", headerShown: true }} />
      <View style={styles.container}>
        <AnimInScale style={styles.card}>
          <Icon name="nutrition" size={44} />
          <Text style={styles.title}>Trang này không có</Text>
          <Text style={styles.body}>Luống rau bạn tìm không ở đây. Quay về trang chủ nhé.</Text>
          <Link href="/tabs" style={styles.link}>
            Về trang chủ
          </Link>
        </AnimInScale>
      </View>
    </>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 28, width: "100%" },
  title: {  ...type.titleLarge, color: colors.onSurface, marginTop: 8 },
  body: {  ...type.bodyMedium, color: colors.onSurfaceVariant, textAlign: "center", marginTop: 6 },
  link: { ...type.labelLarge, color: colors.onPrimary, backgroundColor: colors.primary, borderRadius: shape.full, paddingVertical: 12, paddingHorizontal: 22, marginTop: 18, overflow: "hidden" },
});
