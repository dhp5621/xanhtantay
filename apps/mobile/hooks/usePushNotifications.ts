import { useEffect } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { apiFetch } from "../constants/api";
import { useSession } from "./useSession";

// Show broadcasts as a banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Asks for permission and returns this device's Expo push token, or null when push isn't available. */
async function getExpoPushToken(): Promise<string | null> {
  // Simulators can't receive pushes, and Expo Go (SDK 53+) no longer supports remote notifications on Android.
  if (!Device.isDevice) return null;
  if (Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Thông báo chung", importance: Notifications.AndroidImportance.HIGH });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/**
 * Registers this phone for the admin's push broadcasts. Runs on launch and again when the signed-in
 * user changes, so the server links the device to whoever is using it (or keeps it anonymous).
 */
export function usePushNotifications() {
  const { user, loading } = useSession();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getExpoPushToken();
        if (!token || cancelled) return;
        await apiFetch("/push/register", { method: "POST", body: JSON.stringify({ platform: Platform.OS, token }) });
      } catch (e) {
        console.warn("[push] registration failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, userId]);
}
