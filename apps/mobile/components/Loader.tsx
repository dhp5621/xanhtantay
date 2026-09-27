import { useEffect } from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useDerivedValue, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { MORPH, ROTATE, LOADER_DURATION_MS } from "../constants/loader-shapes";
import { Icon } from "./Icon";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Per-segment CSS easings, precomputed so the UI-thread worklets only evaluate them.
const MORPH_EASE = MORPH.map((k) => Easing.bezierFn(k.ease[0], k.ease[1], k.ease[2], k.ease[3]));
const ROTATE_EASE = ROTATE.map((k) => Easing.bezierFn(k.ease[0], k.ease[1], k.ease[2], k.ease[3]));
const MORPH_T = MORPH.map((k) => k.t);
const MORPH_PTS = MORPH.map((k) => k.pts);
const ROTATE_T = ROTATE.map((k) => k.t);
const ROTATE_DEG = ROTATE.map((k) => k.deg);

function segment(ts: number[], p: number): [number, number, number] {
  "worklet";
  let i = 0;
  while (i < ts.length - 1 && p >= ts[i + 1]) i++;
  const t0 = ts[i];
  const t1 = i + 1 < ts.length ? ts[i + 1] : 1;
  const local = t1 > t0 ? (p - t0) / (t1 - t0) : 0;
  return [i, Math.min(i + 1, ts.length - 1), local];
}

/**
 * The web's `.m3-loader`: a Material 3 Expressive shape that morphs through the same 15 keyframe
 * polygons and rotates with the same stepped easing, ported point-for-point from globals.css.
 */
export function Loader({ size = 48, color, style }: { size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: LOADER_DURATION_MS, easing: Easing.linear }), -1, false);
  }, [progress]);

  const d = useDerivedValue(() => {
    const [i, j, local] = segment(MORPH_T, progress.value);
    const e = MORPH_EASE[i](local);
    const a = MORPH_PTS[i];
    const b = MORPH_PTS[j];
    let s = "";
    for (let k = 0; k < a.length; k += 2) {
      const x = a[k] + (b[k] - a[k]) * e;
      const y = a[k + 1] + (b[k + 1] - a[k + 1]) * e;
      s += (k === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2) + " ";
    }
    return s + "Z";
  });
  const animatedProps = useAnimatedProps(() => ({ d: d.value }));
  const rotate = useAnimatedStyle(() => {
    const [i, j, local] = segment(ROTATE_T, progress.value);
    const e = ROTATE_EASE[i](local);
    const deg = ROTATE_DEG[i] + (ROTATE_DEG[j] - ROTATE_DEG[i]) * e;
    return { transform: [{ rotate: `${deg}deg` }] };
  });

  return (
    <Animated.View style={[{ width: size, height: size }, rotate, style]} accessibilityRole="progressbar" accessibilityLabel="Đang tải">
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <AnimatedPath animatedProps={animatedProps} fill={color ?? colors.primary} />
      </Svg>
    </Animated.View>
  );
}

/** Centred loader card with a label — the web's PageLoader, for route/screen loading states. */
export function PageLoader({ label = "Đang tải…", style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.page, style]}>
      <View style={styles.card}>
        <Loader size={48} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="eco" size={16} filled color={colors.primary} />
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    page: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.surface, padding: 24 },
    card: { alignItems: "center", gap: 14, backgroundColor: c.surfaceContainerLow, borderRadius: shape.xl, paddingVertical: 24, paddingHorizontal: 32 },
    label: { ...type.labelLarge, color: c.onSurfaceVariant },
  });
