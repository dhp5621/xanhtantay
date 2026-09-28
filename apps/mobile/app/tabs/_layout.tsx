import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import { useSession } from "../../hooks/useSession";
import { Icon } from "../../components/Icon";

// The focused tab gets the filled glyph.
const icon = (name: string) => ({ color, focused }: { color: string; focused: boolean }) => <Icon name={name} size={26} color={color} filled={focused} />;

/**
 * Customers: Trang chủ / Hộp rau / Gom đơn / Đơn hàng / Tài khoản.
 * Farmers: Lệnh thu hoạch / Tài khoản — nothing else.
 * Visitors: Trang chủ (landing) / Tài khoản (login).
 * Hidden routes (href: null) stay reachable by deep link.
 */
export default function TabsLayout() {
  const { user, loading } = useSession();
  const header = { headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.onSurface, headerShadowVisible: false, headerTitleStyle: { fontWeight: "700" as const } };
  const isFarmer = user?.role === "farmer";
  // Signed-out visitors only get Home and Account; everything else needs a session.
  // Don't hide tabs with href: null while loading, otherwise Expo Router flashes +not-found for the active tab.
  const customerOnly = loading ? undefined : user && !isFarmer ? undefined : null;
  const farmerOnly = loading ? undefined : isFarmer ? undefined : null;
  // Edge-to-edge: the system navigation bar overlays the app, so the tab bar grows by the bottom inset.
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: colors.surfaceContainerLow, borderTopWidth: 0, height: 58 + bottom, paddingTop: 8, paddingBottom: bottom },
        tabBarLabelStyle: { fontWeight: "600", fontSize: isFarmer ? 12 : 11 },
        tabBarActiveBackgroundColor: "transparent",
        headerShown: false,
        animation: "fade",
        transitionSpec: { animation: "timing", config: { duration: 180 } },
        sceneStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Trang chủ", tabBarIcon: icon("home"), href: isFarmer ? null : undefined }} />
      <Tabs.Screen name="hop-rau" options={{ title: "Hộp rau", tabBarIcon: icon("inventory_2"), href: customerOnly }} />
      <Tabs.Screen name="gom-don" options={{ title: "Gom đơn", tabBarIcon: icon("groups"), href: customerOnly }} />
      <Tabs.Screen name="don-hang" options={{ title: "Đơn hàng", tabBarIcon: icon("package_2"), href: customerOnly }} />

      <Tabs.Screen name="farmer" options={{ ...header, title: "Lệnh thu hoạch", tabBarIcon: icon("agriculture"), href: farmerOnly }} />

      <Tabs.Screen name="tai-khoan" options={{ title: "Tài khoản", tabBarIcon: icon("account_circle") }} />
    </Tabs>
  );
}
