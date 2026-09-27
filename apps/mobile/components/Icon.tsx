import { Text, type StyleProp, type TextStyle } from "react-native";
import { ICON_CODEPOINTS, ICON_CODEPOINTS_FILLED } from "../constants/icon-names";
import { colors } from "../constants/theme";

export const ICON_FONT = "MaterialSymbolsRounded";
export const ICON_FONT_FILLED = "MaterialSymbolsRoundedFilled";

const has = (m: Record<string, number>, k: string) => Object.prototype.hasOwnProperty.call(m, k);
export const isIconName = (s: string | undefined | null): s is string => !!s && (has(ICON_CODEPOINTS, s) || has(ICON_CODEPOINTS_FILLED, s));

/**
 * Material Symbols Rounded with the same names as the web's <Icon> (apps/web/src/components/ui/Icon.tsx).
 * The glyph is drawn by its codepoint rather than the ligature name: native text drops ligatures when
 * letterSpacing is set or the icon is nested in styled text, which showed the name as plain text.
 * Without an explicit color the icon uses the theme's on-surface color (so it flips with dark mode).
 */
export function Icon({ name, size = 24, filled = false, color, style }: { name: string; size?: number; filled?: boolean; color?: string; style?: StyleProp<TextStyle> }) {
  const tint = color ?? colors.onSurface;
  if (!isIconName(name)) {
    // Not an icon name (e.g. an emoji): render as plain text so older call sites keep working.
    return (
      <Text style={[{ fontSize: size * 0.85, lineHeight: size, color: tint }, style]} allowFontScaling={false}>
        {name}
      </Text>
    );
  }
  // Use the filled face when it has the glyph; otherwise fall back to the outlined one.
  const useFilled = filled ? has(ICON_CODEPOINTS_FILLED, name) : !has(ICON_CODEPOINTS, name);
  const codepoint = useFilled ? ICON_CODEPOINTS_FILLED[name] : ICON_CODEPOINTS[name];
  return (
    <Text
      style={[
        {
          fontFamily: useFilled ? ICON_FONT_FILLED : ICON_FONT,
          fontSize: size,
          lineHeight: size,
          color: tint,
          // Reset anything inherited from a parent <Text> that would distort the glyph.
          fontWeight: "400",
          fontStyle: "normal",
          letterSpacing: 0,
          textTransform: "none",
          includeFontPadding: false,
          textAlign: "center",
        },
        style,
      ]}
      allowFontScaling={false}
      selectable={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {String.fromCodePoint(codepoint)}
    </Text>
  );
}
