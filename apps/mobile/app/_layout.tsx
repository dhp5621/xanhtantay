import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SystemBars } from "react-native-edge-to-edge";
import { Redirect, Stack, usePathname } from "expo-router";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SessionProvider, useSession } from "../hooks/useSession";
import { AddressProvider } from "../hooks/useAddress";
import { LiveProvider } from "../hooks/useLive";
import { ThemeProvider, useTheme } from "../hooks/useTheme";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { DialogProvider } from "../components/Dialog";
import { colors } from "../constants/theme";
import { ICON_FONT, ICON_FONT_FILLED } from "../components/Icon";
import { EMOJI_FAMILY } from "../components/EmojiText";

// Keep the native splash up until the icon font is ready so icons never flash as ligature text.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions?.({ duration: 300, fade: true });

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // The icon fonts are required; the 10 MB emoji font is best-effort (Android only) and must
      // never keep the app from starting if it fails to load.
      try {
        await Font.loadAsync({
          [ICON_FONT]: require("../assets/fonts/MaterialSymbolsRounded.ttf"),
          [ICON_FONT_FILLED]: require("../assets/fonts/MaterialSymbolsRoundedFilled.ttf"),
        });
      } catch {
        // icons fall back to their names; still start
      }
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
      if (Platform.OS === "android") Font.loadAsync({ [EMOJI_FAMILY]: require("../assets/fonts/NotoColorEmoji.ttf") }).catch(() => {});
    })();
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ThemeProvider>
        <SessionProvider>
          <AddressProvider>
            <LiveProvider>
              <DialogProvider>
                <Navigator />
              </DialogProvider>
            </LiveProvider>
          </AddressProvider>
        </SessionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Signed-out visitors may only open these (the web shows visitors just the landing page + login;
// the public box trace stays reachable since the QR code on a box links straight to it).
const PUBLIC_PATHS = new Set(["/", "/tabs", "/tabs/index", "/tabs/tai-khoan", "/dang-nhap", "/tra-cuu"]);

function Navigator() {
  const { scheme } = useTheme();
  const { user, loading } = useSession();
  const pathname = usePathname();
  usePushNotifications();
  const gated = !loading && !user && !PUBLIC_PATHS.has(pathname) && !pathname.startsWith("/tra-cuu");
  const loginHref = "/dang-nhap?next=" + encodeURIComponent(pathname);
  return (
    <>
      {gated ? <Redirect href={loginHref as never} /> : null}
      {/* Edge-to-edge: status + navigation bar icons follow the scheme; both bars stay transparent. */}
      <SystemBars style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 320,
          contentStyle: { backgroundColor: colors.surface },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.onSurface,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "700" },
          headerBackTitle: "Quay lại",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="tabs" options={{ animation: "fade" }} />
        <Stack.Screen name="dang-nhap/index" options={{ animation: "fade_from_bottom" }} />
        <Stack.Screen name="hop-rau/[slug]" options={{ headerShown: true, title: "Hộp rau" }} />
        <Stack.Screen name="don-hang/[id]" options={{ headerShown: true, title: "Chi tiết đơn hàng" }} />
        <Stack.Screen name="don-hang/hoan-tien/[id]" options={{ headerShown: true, title: "Trả hàng / Hoàn tiền" }} />
        <Stack.Screen name="farms/index" options={{ headerShown: true, title: "Vườn rau" }} />
        <Stack.Screen name="farms/[id]" options={{ headerShown: true, title: "Vườn rau" }} />
        <Stack.Screen name="farmer/nang-suat" options={{ headerShown: true, title: "Rau củ đăng ký" }} />
        <Stack.Screen name="farmer/vuon" options={{ headerShown: true, title: "Thông tin vườn" }} />
        <Stack.Screen name="dinh-ky/index" options={{ headerShown: true, title: "Gói định kỳ" }} />
        <Stack.Screen name="tra-cuu/index" options={{ headerShown: true, title: "Truy xuất hộp rau" }} />
        <Stack.Screen name="tra-cuu/[id]" options={{ headerShown: true, title: "Truy xuất hộp rau" }} />
      </Stack>
    </>
  );
}
