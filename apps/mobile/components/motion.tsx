import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle, type PressableProps, Platform } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { colors, shape } from "../constants/theme";

/*
 * Motion tokens mirroring apps/web/src/app/globals.css:
 *   --ease-emphasized-decel: cubic-bezier(0.05, 0.7, 0.1, 1)   --dur-medium-4: 400ms
 *   --spring-default-spatial ≈ damping 18 / stiffness 180, "lift" on press, staggered .anim-in
 */
export const emphasizedDecel = Easing.bezier(0.05, 0.7, 0.1, 1);
export const standard = Easing.bezier(0.2, 0, 0, 1);
export const SPRING = { damping: 18, stiffness: 220, mass: 0.8 };
export const STAGGER_MS = 60;

type InProps = { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle>; index?: number };

/** `.anim-in` — fade + rise. `index` staggers like the web's `.stagger` children. */
export function AnimIn({ children, delay = 0, index = 0, style }: InProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay + index * STAGGER_MS).duration(420).easing(emphasizedDecel)} style={style}>
      {children}
    </Animated.View>
  );
}

/** `.anim-in-scale` — fade + zoom for heroes/cards. */
export function AnimInScale({ children, delay = 0, index = 0, style }: InProps) {
  return (
    <Animated.View entering={ZoomIn.delay(delay + index * STAGGER_MS).duration(380).easing(emphasizedDecel)} style={style}>
      {children}
    </Animated.View>
  );
}

export function AnimFade({ children, delay = 0, index = 0, style }: InProps) {
  return (
    <Animated.View entering={FadeIn.delay(delay + index * STAGGER_MS).duration(300)} style={style}>
      {children}
    </Animated.View>
  );
}

export function AnimUp({ children, delay = 0, index = 0, style }: InProps) {
  return (
    <Animated.View entering={FadeInUp.delay(delay + index * STAGGER_MS).duration(420).easing(emphasizedDecel)} style={style}>
      {children}
    </Animated.View>
  );
}

type PressProps = PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** how far to shrink on press; the web's `.lift` hovers up, touch presses down */
  scaleTo?: number;
  haptic?: boolean | Haptics.ImpactFeedbackStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * `.lift` / `.m3-card-action` — spring scale on press, optional haptic tick.
 * The style goes on the Pressable itself (not a nested view) so flex/size props like `flex: 1`
 * or `aspectRatio` lay out against the real parent — a nested view collapsed fixed-size thumbnails.
 */
export function PressableScale({ children, style, scaleTo = 0.97, haptic = false, onPressIn, onPressOut, onPress, disabled, ...rest }: PressProps) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic && Platform.OS !== "web") {
          Haptics.impactAsync(typeof haptic === "boolean" ? Haptics.ImpactFeedbackStyle.Light : haptic).catch(() => {});
        }
        onPress?.(e);
      }}
      style={[style, anim, disabled && { opacity: 0.5 }]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

/** `.m3-progress` — width eases to the target; `wavy` pulses while incomplete like the web's wavy track. */
export function AnimatedProgress({ value, color = colors.primary, track, height = 8, wavy = false, style }: { value: number; color?: string; track?: string; height?: number; wavy?: boolean; style?: StyleProp<ViewStyle> }) {
  const pct = useSharedValue(0);
  const pulse = useSharedValue(1);
  const trackColor = track ?? colors.progressTrack;
  useEffect(() => {
    pct.value = withTiming(Math.max(0, Math.min(100, value)), { duration: 700, easing: emphasizedDecel });
  }, [value, pct]);
  useEffect(() => {
    pulse.value = wavy ? withRepeat(withSequence(withTiming(0.75, { duration: 900, easing: standard }), withTiming(1, { duration: 900, easing: standard })), -1, true) : withTiming(1);
  }, [wavy, pulse]);
  const bar = useAnimatedStyle(() => ({ width: `${pct.value}%`, opacity: pulse.value }));
  return (
    <Animated.View style={[{ height, backgroundColor: trackColor, borderRadius: shape.full, overflow: "hidden" }, style]}>
      <Animated.View style={[{ height, backgroundColor: color, borderRadius: shape.full }, bar]} />
    </Animated.View>
  );
}

/** Shimmering placeholder (the web's image skeleton) — use while lists/images load. */
export function Skeleton({ width = "100%", height = 16, radius = shape.md, style }: { width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const x = useSharedValue(-1);
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [x]);
  const band = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 260 }] }));
  return (
    <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceContainerHigh, overflow: "hidden" }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, band]}>
        <LinearGradient colors={["transparent", colors.shimmerBand, "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: 260, height: "100%" }} />
      </Animated.View>
    </Animated.View>
  );
}

/** `.m3-hero-blob` — a soft floating circle behind hero copy. */
export function HeroBlob({ size = 260, right = -80, top = -100, color = "rgba(255,255,255,.28)", delay = 0 }: { size?: number; right?: number; top?: number; color?: string; delay?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 6000 + delay, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 6000 + delay, easing: Easing.inOut(Easing.sin) })), -1, false);
  }, [t, delay]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: t.value * 18 }, { translateX: t.value * -10 }, { scale: 1 + t.value * 0.06 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, right, top }, anim]} />;
}

export { Animated };
