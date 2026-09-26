import { Tabs } from "expo-router";
import { colors } from "../../constants/theme";
import { useSession } from "../../hooks/useSession";

export default function TabsLayout() {
  const { user } = useSession();
  const isFarmer = user?.role === "farmer";

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
      <Tabs.Screen name="farms" options={{ title: "Vườn rau", href: isFarmer ? null : undefined }} />
      <Tabs.Screen name="gom-don" options={{ title: "Gom đơn", href: isFarmer ? null : undefined }} />
      <Tabs.Screen name="don-hang" options={{ title: "Đơn hàng", href: isFarmer ? null : undefined }} />
      <Tabs.Screen name="farmer" options={{ title: "Nông dân", href: isFarmer ? undefined : null }} />
      <Tabs.Screen name="tai-khoan" options={{ title: "Tài khoản" }} />
    </Tabs>
  );
}
