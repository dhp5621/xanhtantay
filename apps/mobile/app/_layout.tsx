import { Stack } from "expo-router";
import { SessionProvider } from "../hooks/useSession";
import { CartProvider } from "../hooks/useCart";

export default function RootLayout() {
  return (
    <SessionProvider>
      <CartProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="tabs" />
          <Stack.Screen name="dang-nhap/index" />
          <Stack.Screen name="farms/[id]" options={{ headerShown: true, title: "Vườn" }} />
          <Stack.Screen name="cart/index" options={{ headerShown: true, title: "Giỏ rau", presentation: "modal" }} />
          <Stack.Screen name="vuon-cua-toi/index" options={{ headerShown: true, title: "Vườn của tôi" }} />
          <Stack.Screen name="dinh-ky/index" options={{ headerShown: true, title: "Đơn định kỳ" }} />
          <Stack.Screen name="cong-thuc/index" options={{ headerShown: true, title: "Công thức nấu ăn" }} />
          <Stack.Screen name="ke-hoach/[id]" options={{ headerShown: true, title: "Kế hoạch bữa ăn" }} />
          <Stack.Screen name="tra-cuu/index" options={{ headerShown: true, title: "Tra cứu gói rau" }} />
        </Stack>
      </CartProvider>
    </SessionProvider>
  );
}
