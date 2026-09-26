import { Stack } from "expo-router";
import { colors } from "../../../constants/theme";

export default function FarmerLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.onSurface, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: "Nông dân" }} />
      <Stack.Screen name="san-pham" options={{ title: "Sản phẩm" }} />
      <Stack.Screen name="don-hang" options={{ title: "Đơn hàng" }} />
      <Stack.Screen name="nhat-ky" options={{ title: "Nhật ký vườn" }} />
    </Stack>
  );
}
