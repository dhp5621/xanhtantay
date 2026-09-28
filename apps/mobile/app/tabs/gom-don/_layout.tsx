import { Stack } from "expo-router";
import { colors } from "../../../constants/theme";

export default function GomDonLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.onSurface, headerShadowVisible: false, headerTitleStyle: { fontWeight: "700" }, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="index" options={{ title: "Gom đơn chung" }} />
      <Stack.Screen name="[id]" options={{ title: "Nhóm gom đơn" }} />
    </Stack>
  );
}
