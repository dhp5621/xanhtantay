import { Stack } from "expo-router";
import { colors } from "../../../constants/theme";

export default function FarmerLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700" },
        headerBackTitle: "Quay lại",
        contentStyle: { backgroundColor: colors.surface },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Tổng quan vườn" }} />
      <Stack.Screen name="san-pham" options={{ title: "Sản phẩm" }} />
      <Stack.Screen name="don-hang" options={{ title: "Đơn hàng" }} />
      <Stack.Screen name="nhat-ky" options={{ title: "Nhật ký vườn" }} />
      <Stack.Screen name="dang-ky" options={{ title: "Khách đăng ký" }} />
      <Stack.Screen name="tem/[id]" options={{ title: "Tem QR" }} />
    </Stack>
  );
}
