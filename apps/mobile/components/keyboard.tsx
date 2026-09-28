import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type RefObject } from "react";
import { Keyboard, Platform, ScrollView, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

/**
 * Keyboard handling that does not depend on the window being resized.
 *
 * With edge-to-edge on Android the system no longer shrinks the window when the keyboard opens,
 * and KeyboardAvoidingView does nothing there without a behaviour. These helpers measure how far
 * the keyboard really covers a view and make room for exactly that, so they are also correct
 * where the system did resize (the overlap is then zero).
 */
const SHOW = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const HIDE = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
/** Space kept between the focused field and the keyboard. */
const GAP = 20;

/** How many points of `ref` the keyboard covers, and a counter that ticks each time it opens. */
function useKeyboardOverlap(ref: RefObject<View | null>) {
  const [overlap, setOverlap] = useState(0);
  const [shown, setShown] = useState(0);
  const top = useRef<number | null>(null);

  const measure = useCallback(() => {
    const view = ref.current;
    if (top.current == null || !view) return;
    view.measureInWindow((_x, y, _w, h) => {
      if (top.current == null) return;
      const next = Math.max(0, Math.round(y + h - top.current));
      setOverlap((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    });
  }, [ref]);

  useEffect(() => {
    // Mounted while the keyboard is already up (a sheet opening over a focused field).
    try {
      const now = Keyboard.isVisible() ? Keyboard.metrics() : undefined;
      if (now) {
        top.current = now.screenY;
        measure();
      }
    } catch {
      // older runtimes: the next show event sets it
    }
    const subs = [
      Keyboard.addListener(SHOW, (e) => {
        top.current = e.endCoordinates.screenY;
        setShown((n) => n + 1);
        measure();
      }),
      Keyboard.addListener(HIDE, () => {
        top.current = null;
        setOverlap(0);
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [measure]);

  return { overlap, shown, measure };
}

/** A view that keeps its content above the keyboard. For sheets and dialogs anchored to the bottom. */
export function KeyboardPad({ style, children, onLayout, ...rest }: ViewProps) {
  const ref = useRef<View>(null);
  const { overlap, measure } = useKeyboardOverlap(ref);
  return (
    <View
      ref={ref}
      {...rest}
      onLayout={(e) => {
        onLayout?.(e);
        measure();
      }}
      style={[style, overlap > 0 && { paddingBottom: overlap }]}
    >
      {children}
    </View>
  );
}

type Props = ScrollViewProps & {
  /** Style of the wrapper that gives way to the keyboard. Fills its parent by default. */
  containerStyle?: StyleProp<ViewStyle>;
  /** False inside a KeyboardPad: the room is already made, only bring the field into view. */
  pad?: boolean;
};

/**
 * ScrollView for any screen with text fields: gives way to the keyboard and scrolls the focused
 * field into view, also when focus moves from one field to the next.
 */
export const KeyboardScroll = forwardRef<ScrollView, Props>(function KeyboardScroll({ containerStyle, pad = true, onScroll, children, keyboardShouldPersistTaps = "handled", ...rest }, forwarded) {
  const box = useRef<View>(null);
  const scroll = useRef<ScrollView>(null);
  const offset = useRef(0);
  const height = useRef(0);
  useImperativeHandle(forwarded, () => scroll.current as ScrollView);
  const { overlap, shown, measure } = useKeyboardOverlap(box);
  const covered = useRef(0);
  covered.current = pad ? overlap : 0;

  const reveal = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const host = box.current;
    if (!input || !host || !height.current) return;
    // measureLayout only tells whether the field lives inside this scroll view (it fails otherwise).
    // Its numbers are not used: depending on the renderer they ignore how far the list is scrolled.
    // Positions on screen always include it.
    input.measureLayout(
      host,
      () => {
        host.measureInWindow((_hx, hostY) => {
          input.measureInWindow((_x, inputY, _w, h) => {
            const y = inputY - hostY;
            const visible = height.current - covered.current;
            // A field taller than the room left (a long note) is aligned by its top instead.
            const bottom = Math.min(y + h, y + visible - 2 * GAP) + GAP;
            if (bottom > visible) scroll.current?.scrollTo({ y: Math.max(0, offset.current + bottom - visible), animated: true });
            else if (y < GAP) scroll.current?.scrollTo({ y: Math.max(0, offset.current + y - GAP), animated: true });
          });
        });
      },
      () => {}
    );
  }, []);

  // After the keyboard opened and the room was made, bring the field into view.
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(reveal, Platform.OS === "ios" ? 60 : 120);
    return () => clearTimeout(t);
  }, [shown, overlap, reveal]);

  // Focus events bubble: moving to the next field with the keyboard already open lands here.
  const focusProps = { onFocus: () => setTimeout(reveal, 120) } as ViewProps;

  return (
    <View
      ref={box}
      {...focusProps}
      onLayout={(e) => {
        height.current = e.nativeEvent.layout.height;
        measure();
      }}
      style={[{ flex: 1 }, containerStyle, pad && overlap > 0 && { paddingBottom: overlap }]}
    >
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        {...rest}
        scrollEventThrottle={16}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          offset.current = e.nativeEvent.contentOffset.y;
          onScroll?.(e);
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
});
