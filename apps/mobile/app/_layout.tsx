import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SessionProvider } from "../hooks/useSession";
import { CartProvider } from "../hooks/useCart";
import { LiveProvider } from "../hooks/useLive";
import { ThemeProvider, useTheme } from "../hooks/useTheme";
import { DialogProvider } from "../components/Dialog";
import { colors } from "../constants/theme";
import { ICON_FONT, ICON_FONT_FILLED } from "../components/Icon";

// Keep the native splash up until the icon font is ready so icons never flash as ligature text.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions?.({ duration: 300, fade: true });

const FONTS: Record<string, number> = {
  [ICON_FONT]: require("../assets/fonts/MaterialSymbolsRounded.ttf"),
  [ICON_FONT_FILLED]: require("../assets/fonts/MaterialSymbolsRoundedFilled.ttf"),
};
// Android only: iOS ships Apple Color Emoji and cannot load Google's CBDT bitmap font anyway.
if (Platform.OS === "android") FONTS.NotoColorEmoji = require("../assets/fonts/NotoColorEmoji.ttf");

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ThemeProvider>
        <SessionProvider>
          <CartProvider>
            <LiveProvider>
              <DialogProvider>
                <Navigator />
              </DialogProvider>
            </LiveProvider>
          </CartProvider>
        </SessionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function Navigator() {
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} backgroundColor={colors.surface} />
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
        <Stack.Screen name="farms/[id]" options={{ headerShown: true, title: "Vườn rau" }} />
        <Stack.Screen name="nhat-ky/[id]" options={{ headerShown: true, title: "Nhật ký vườn" }} />
        <Stack.Screen name="cart/index" options={{ headerShown: true, title: "Giỏ rau", presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="vuon-cua-toi/index" options={{ headerShown: true, title: "Vườn của tôi" }} />
        <Stack.Screen name="dinh-ky/index" options={{ headerShown: true, title: "Gói đăng ký" }} />
        <Stack.Screen name="ke-hoach/[id]" options={{ headerShown: true, title: "Kế hoạch ăn" }} />
        <Stack.Screen name="tra-cuu/index" options={{ headerShown: true, title: "Tra cứu gói rau" }} />
        <Stack.Screen name="tem/[id]" options={{ headerShown: true, title: "Tem QR" }} />
      </Stack>
    </>
  );
}
