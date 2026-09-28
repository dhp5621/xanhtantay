import { useCallback, useRef, useState } from "react";
import { useWindowDimensions, type View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Keep in step with `tabBarStyle.height` in app/tabs/_layout.tsx. */
const TAB_BAR = 58;

/**
 * How far a screen reaches underneath the bottom tab bar. A stack nested in a tab can be laid
 * out to the very bottom of the window, so anything pinned to the bottom of the screen (a floating
 * button) has to be lifted by this much. Zero when the screen already ends above the bar.
 */
export function useTabBarOverlap() {
  const ref = useRef<View>(null);
  const [overlap, setOverlap] = useState(0);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const barTop = height - (TAB_BAR + Math.max(insets.bottom, 10));

  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((_x, y, _w, h) => {
      const next = Math.max(0, Math.round(y + h - barTop));
      setOverlap((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    });
  }, [barTop]);

  return { ref, onLayout, overlap };
}
