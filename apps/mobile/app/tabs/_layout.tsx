import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1B6B3A",
        tabBarInactiveTintColor: "#707973",
        tabBarStyle: { backgroundColor: "#F6FBF4" },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Trang chủ", tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="farms"
        options={{ title: "Vườn rau", tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="don-hang"
        options={{ title: "Đơn hàng", tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="tai-khoan"
        options={{ title: "Tài khoản", tabBarIcon: () => null }}
      />
    </Tabs>
  );
}
