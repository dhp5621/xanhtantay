import { Text, type StyleProp, type TextStyle } from "react-native";
import { ICON_NAMES } from "../constants/icon-names";

export const ICON_FONT = "MaterialSymbolsRounded";
export const ICON_FONT_FILLED = "MaterialSymbolsRoundedFilled";

export const isIconName = (s: string | undefined | null): s is string => !!s && ICON_NAMES.has(s);

/**
 * Material Symbols Rounded, same ligature names as the web's <Icon> (apps/web/src/components/ui/Icon.tsx).
 * Glyphs come from assets/fonts (see scripts/icon-subset.mjs). Anything that isn't a known icon name
 * (an emoji, say) is rendered as plain text so older call sites keep working.
 */
export function Icon({ name, size = 24, filled = false, color, style }: { name: string; size?: number; filled?: boolean; color?: string; style?: StyleProp<TextStyle> }) {
  if (!isIconName(name)) {
    return (
      <Text style={[{ fontSize: size * 0.85, lineHeight: size, color }, style]} allowFontScaling={false}>
        {name}
      </Text>
    );
  }
  return (
    <Text
      style={[{ fontFamily: filled ? ICON_FONT_FILLED : ICON_FONT, fontSize: size, lineHeight: size, color, includeFontPadding: false, textAlign: "center" }, style]}
      allowFontScaling={false}
      selectable={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {name}
    </Text>
  );
}
