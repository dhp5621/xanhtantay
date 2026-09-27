import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import { useSession } from "../../hooks/useSession";
import { Icon } from "../../components/Icon";

// Same icon names as apps/web/src/components/layout/nav-config.ts; the focused tab gets the filled glyph.
const icon = (name: string) => ({ color, focused }: { color: string; focused: boolean }) => <Icon name={name} size={26} color={color} filled={focused} />;


/**
 * Customers: Home / Rau củ / Vườn / Bếp / Tài khoản (CUSTOMER_MOBILE_NAV).
 * Farmers: Tổng quan / Đơn hàng / Sản phẩm / Đăng ký / Nhật ký (FARMER_NAV) + Tài khoản.
 * Hidden routes (href: null) stay reachable by deep link.
 */
export default function TabsLayout() {
  const { user } = useSession();
  const header = { headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.onSurface, headerShadowVisible: false, headerTitleStyle: { fontWeight: "700" as const } };
  const isFarmer = user?.role === "farmer";
  // Like the web's VISITOR_NAV: signed-out visitors only get Home and Account; everything else needs a session.
  const customerOnly = user && !isFarmer ? undefined : null;
  const farmerOnly = isFarmer ? undefined : null;
  // Edge-to-edge: the system navigation bar overlays the app, so the tab bar grows by the bottom inset.
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: colors.surfaceContainerLow, borderTopWidth: 0, height: 58 + bottom, paddingTop: 8, paddingBottom: bottom },
        tabBarLabelStyle: { fontWeight: "600", fontSize: isFarmer ? 10 : 11 },
        tabBarActiveBackgroundColor: "transparent",
        headerShown: false,
        animation: "shift",
        sceneStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Trang chủ", tabBarIcon: icon("home"), href: isFarmer ? null : undefined }} />
      <Tabs.Screen name="rau-cu" options={{ title: "Rau củ", tabBarIcon: icon("nutrition"), href: customerOnly }} />
      <Tabs.Screen name="farms" options={{ title: "Vườn", tabBarIcon: icon("potted_plant"), href: customerOnly }} />
      <Tabs.Screen name="cong-thuc" options={{ title: "Bếp", tabBarIcon: icon("skillet"), href: customerOnly }} />
      <Tabs.Screen name="gom-don" options={{ title: "Gom đơn", tabBarIcon: icon("groups"), href: null }} />
      <Tabs.Screen name="don-hang" options={{ title: "Đơn hàng", tabBarIcon: icon("package_2"), href: null }} />

      <Tabs.Screen name="farmer" options={{ ...header, title: "Tổng quan", headerTitle: "Tổng quan vườn", tabBarIcon: icon("dashboard"), href: farmerOnly }} />
      <Tabs.Screen name="farmer-don-hang" options={{ ...header, title: "Đơn hàng", tabBarIcon: icon("package_2"), href: farmerOnly }} />
      <Tabs.Screen name="farmer-san-pham" options={{ ...header, title: "Sản phẩm", tabBarIcon: icon("eco"), href: farmerOnly }} />
      <Tabs.Screen name="farmer-dang-ky" options={{ ...header, title: "Đăng ký", headerTitle: "Khách đăng ký", tabBarIcon: icon("event_repeat"), href: farmerOnly }} />
      <Tabs.Screen name="farmer-nhat-ky" options={{ ...header, title: "Nhật ký", headerTitle: "Nhật ký vườn", tabBarIcon: icon("photo_camera"), href: farmerOnly }} />

      <Tabs.Screen name="tai-khoan" options={{ title: "Tài khoản", tabBarIcon: icon("account_circle") }} />
    </Tabs>
  );
}
