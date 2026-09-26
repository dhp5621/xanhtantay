// Mirrors apps/web/src/app/globals.css — Material 3 Expressive tokens (light scheme).
export const colors = {
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
} as const;

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
