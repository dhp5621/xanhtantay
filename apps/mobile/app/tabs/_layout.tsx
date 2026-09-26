import { Tabs } from "expo-router";
import { colors } from "../../constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: colors.surfaceContainerLow, borderTopWidth: 0 },
        tabBarLabelStyle: { fontWeight: "600", fontSize: 12 },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Trang chủ" }} />
      <Tabs.Screen name="farms" options={{ title: "Vườn rau" }} />
      <Tabs.Screen name="don-hang" options={{ title: "Đơn hàng" }} />
      <Tabs.Screen name="tai-khoan" options={{ title: "Tài khoản" }} />
    </Tabs>
  );
}
