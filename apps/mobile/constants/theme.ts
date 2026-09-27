import { createContext, useContext, useMemo } from "react";
import { Platform } from "react-native";

// Mirrors apps/web/src/app/globals.css — Material 3 Expressive tokens, light and dark schemes.
const lightColors = {
  primary: "#1B6B3A",
  onPrimary: "#FFFFFF",
  primaryContainer: "#A8F5BE",
  onPrimaryContainer: "#002110",
  secondary: "#4E6356",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#D0E8D8",
  onSecondaryContainer: "#0B1F14",
  tertiary: "#3A6572",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#BEEAF9",
  onTertiaryContainer: "#001F27",
  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#410002",

  surface: "#F6FBF4",
  surfaceDim: "#D6DBD4",
  surfaceBright: "#F6FBF4",
  onSurface: "#191C19",
  surfaceVariant: "#DCE5DC",
  onSurfaceVariant: "#404943",
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F0F5EE",
  surfaceContainer: "#EAF0E8",
  surfaceContainerHigh: "#E4EAE2",
  surfaceContainerHighest: "#DEE4DC",
  inverseSurface: "#2E312E",
  inverseOnSurface: "#EFF1ED",
  inversePrimary: "#8DD8A4",

  outline: "#707973",
  outlineVariant: "#C0C9C0",

  statusHarvestingBg: "#FFE8B0",
  statusHarvestingFg: "#4B3600",
  statusLoadedBg: "#BEEAF9",
  statusLoadedFg: "#001F27",
  statusDeliveredBg: "#A8F5BE",
  statusDeliveredFg: "#002110",

  scrim: "rgba(0,0,0,.40)",
  shimmerBand: "rgba(255,255,255,.55)",
  progressTrack: "rgba(0,0,0,.08)",
  tintOverlay: "rgba(255,255,255,.35)",
  tintOverlayStrong: "rgba(0,0,0,.08)",
  onImage: "#FFFFFF",
  imageScrim: "rgba(0,0,0,.55)",
};

export type Colors = typeof lightColors;

const darkColors: Colors = {
  primary: "#8DD8A4",
  onPrimary: "#003920",
  primaryContainer: "#005230",
  onPrimaryContainer: "#A8F5BE",
  secondary: "#B4CCBA",
  onSecondary: "#203529",
  secondaryContainer: "#374B3E",
  onSecondaryContainer: "#D0E8D8",
  tertiary: "#A2CED9",
  onTertiary: "#01363F",
  tertiaryContainer: "#1F4D57",
  onTertiaryContainer: "#BEEAF9",
  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",

  surface: "#101410",
  surfaceDim: "#101410",
  surfaceBright: "#363A36",
  onSurface: "#E1E3DF",
  surfaceVariant: "#404943",
  onSurfaceVariant: "#C0C9C0",
  surfaceContainerLowest: "#0B0F0B",
  surfaceContainerLow: "#191C19",
  surfaceContainer: "#1D211D",
  surfaceContainerHigh: "#272B27",
  surfaceContainerHighest: "#323632",
  inverseSurface: "#E1E3DF",
  inverseOnSurface: "#2E312E",
  inversePrimary: "#1B6B3A",

  outline: "#8A938B",
  outlineVariant: "#404943",

  statusHarvestingBg: "#4B3600",
  statusHarvestingFg: "#FFE8B0",
  statusLoadedBg: "#1F4D57",
  statusLoadedFg: "#BEEAF9",
  statusDeliveredBg: "#005230",
  statusDeliveredFg: "#A8F5BE",

  scrim: "rgba(0,0,0,.60)",
  shimmerBand: "rgba(255,255,255,.10)",
  progressTrack: "rgba(255,255,255,.10)",
  tintOverlay: "rgba(255,255,255,.08)",
  tintOverlayStrong: "rgba(255,255,255,.12)",
  onImage: "#FFFFFF",
  imageScrim: "rgba(0,0,0,.55)",
};

export type Scheme = "light" | "dark";

/**
 * The live palette. It is mutated in place when the theme changes and the whole tree is remounted
 * (see hooks/useTheme.tsx), so module-level `colors.x` reads and `useStyles` factories both pick up
 * the new scheme without every screen having to subscribe to a context.
 */
export const colors: Colors = { ...lightColors };
export const schemes: Record<Scheme, Colors> = { light: lightColors, dark: darkColors };

export function applyScheme(scheme: Scheme) {
  Object.assign(colors, schemes[scheme]);
}

/** Bumped by ThemeProvider on every scheme change; useStyles re-runs its factory when it changes. */
export const ThemeKeyContext = createContext<{ key: number; scheme: Scheme }>({ key: 0, scheme: "light" });

export function useScheme(): Scheme {
  return useContext(ThemeKeyContext).scheme;
}

/** `const styles = useStyles(makeStyles)` — a StyleSheet factory evaluated against the current palette. */
export function useStyles<T>(factory: (c: Colors) => T): T {
  const { key } = useContext(ThemeKeyContext);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(colors), [key, factory]);
}

// M3 Expressive shape scale.
export const shape = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  lgIncreased: 20,
  xl: 28,
  xlIncreased: 32,
  xxl: 48,
  full: 9999,
} as const;

/**
 * Kept for compatibility — emoji rendering now goes through components/EmojiText, which sets the
 * bundled Noto Color Emoji on emoji runs only (the font also has digit glyphs, so applying it as a
 * base font made numbers render in the emoji face).
 */
export const emojiFont = {} as const;
export const isAndroid = Platform.OS === "android";

// M3 type scale (subset actually used by mobile screens).
export const type = {
  displaySmall: { fontSize: 36, fontWeight: "400" as const, lineHeight: 44 },
  headlineSmall: { fontSize: 24, fontWeight: "800" as const, lineHeight: 32 },
  titleLarge: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  titleMedium: { fontSize: 16, fontWeight: "700" as const, lineHeight: 24 },
  bodyLarge: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  labelLarge: { fontSize: 14, fontWeight: "700" as const, lineHeight: 20 },
};

export const elevation = {
  1: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.14, shadowRadius: 3, elevation: 1 },
  2: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.14, shadowRadius: 6, elevation: 3 },
  3: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 6 },
};
