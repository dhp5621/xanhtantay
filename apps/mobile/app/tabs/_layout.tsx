import { Tabs } from "expo-router";
import { colors } from "../../constants/theme";
import { useSession } from "../../hooks/useSession";
import { Icon } from "../../components/Icon";

// Same icon names as apps/web/src/components/layout/nav-config.ts; the focused tab gets the filled glyph.
const icon = (name: string) => ({ color, focused }: { color: string; focused: boolean }) => <Icon name={name} size={26} color={color} filled={focused} />;

/**
 * Customers get Home / Rau củ / Vườn / Bếp / Tài khoản (CUSTOMER_MOBILE_NAV); farmers get their console + account.
 * Hidden routes (href: null) stay reachable by deep link.
 */
export default function TabsLayout() {
  const { user } = useSession();
  const isFarmer = user?.role === "farmer";
  const customerOnly = isFarmer ? null : undefined;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: colors.surfaceContainerLow, borderTopWidth: 0, height: 68, paddingTop: 8, paddingBottom: 10 },
        tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
        tabBarActiveBackgroundColor: "transparent",
        headerShown: false,
        animation: "shift",
        sceneStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Trang chủ", tabBarIcon: icon("home"), href: customerOnly }} />
      <Tabs.Screen name="rau-cu" options={{ title: "Rau củ", tabBarIcon: icon("nutrition"), href: customerOnly }} />
      <Tabs.Screen name="farms" options={{ title: "Vườn", tabBarIcon: icon("potted_plant"), href: customerOnly }} />
      <Tabs.Screen name="cong-thuc" options={{ title: "Bếp", tabBarIcon: icon("skillet"), href: customerOnly }} />
      <Tabs.Screen name="gom-don" options={{ title: "Gom đơn", tabBarIcon: icon("groups"), href: null }} />
      <Tabs.Screen name="don-hang" options={{ title: "Đơn hàng", tabBarIcon: icon("package_2"), href: null }} />
      <Tabs.Screen name="farmer" options={{ title: "Vườn của tôi", tabBarIcon: icon("agriculture"), href: isFarmer ? undefined : null }} />
      <Tabs.Screen name="tai-khoan" options={{ title: "Tài khoản", tabBarIcon: icon("account_circle") }} />
    </Tabs>
  );
}
