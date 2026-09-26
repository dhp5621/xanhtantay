import { Stack } from "expo-router";
import { SessionProvider } from "../hooks/useSession";

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="tabs" />
        <Stack.Screen name="dang-nhap/index" />
        <Stack.Screen name="farms/[id]" options={{ headerShown: true, title: "Vườn" }} />
      </Stack>
    </SessionProvider>
  );
}
