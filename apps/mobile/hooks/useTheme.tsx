import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { View, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { applyScheme, colors, ThemeKeyContext, type Scheme } from "../constants/theme";

export type ThemePreference = "system" | "light" | "dark";
const STORAGE_KEY = "xtt-theme";

const PrefContext = createContext<{ preference: ThemePreference; setPreference: (p: ThemePreference) => void; scheme: Scheme }>({ preference: "system", setPreference: () => {}, scheme: "light" });

/**
 * Mirrors the web's ThemeProvider (localStorage "theme": light | dark, else the device scheme).
 * Switching schemes swaps the live palette and remounts the tree so every StyleSheet re-evaluates.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const device = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);
  const scheme: Scheme = preference === "system" ? (device === "dark" ? "dark" : "light") : preference;
  const [key, setKey] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "light" || v === "dark") setPreferenceState(v);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Apply synchronously before children render for the new key so no frame paints with stale colors.
  const applied = useMemo(() => {
    applyScheme(scheme);
    return scheme;
  }, [scheme]);
  useEffect(() => {
    setKey((k) => k + 1);
    SystemUI.setBackgroundColorAsync(colors.surface).catch(() => {});
  }, [applied]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    (p === "system" ? AsyncStorage.removeItem(STORAGE_KEY) : AsyncStorage.setItem(STORAGE_KEY, p)).catch(() => {});
  }, []);

  const pref = useMemo(() => ({ preference, setPreference, scheme }), [preference, setPreference, scheme]);
  const themeKey = useMemo(() => ({ key, scheme }), [key, scheme]);

  if (!loaded) return null;
  return (
    <PrefContext.Provider value={pref}>
      <ThemeKeyContext.Provider value={themeKey}>
        <View key={key} style={{ flex: 1, backgroundColor: colors.surface }}>
          {children}
        </View>
      </ThemeKeyContext.Provider>
    </PrefContext.Provider>
  );
}

export function useTheme() {
  return useContext(PrefContext);
}
