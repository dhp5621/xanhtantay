import { Children, Fragment, type ReactNode } from "react";
import { Platform, Text, type TextProps } from "react-native";

export const EMOJI_FAMILY = "NotoColorEmoji";
// Emoji + variation selectors / ZWJ / skin tones, but NOT plain digits or symbols like "/" and "·".
const EMOJI_RE = /((?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:️|‍(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})|[\u{1F3FB}-\u{1F3FF}])*)/gu;

function wrap(s: string, key: string): ReactNode {
  if (Platform.OS !== "android" || !EMOJI_RE.test(s)) return s;
  EMOJI_RE.lastIndex = 0;
  const parts = s.split(EMOJI_RE);
  return (
    <Fragment key={key}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={{ fontFamily: EMOJI_FAMILY }}>
            {p}
          </Text>
        ) : (
          p
        )
      )}
    </Fragment>
  );
}

/**
 * User-written text (order notes, group names, care messages) may contain emoji newer than the
 * device's system font. Only the emoji runs are set in the bundled Noto Color Emoji — digits, letters
 * and punctuation keep the normal font, so "3/5 người" or "20 năm" never pick up emoji glyphs.
 */
export function EmojiText({ children, ...props }: TextProps) {
  return <Text {...props}>{Children.map(children, (c, i) => (typeof c === "string" ? wrap(c, String(i)) : c))}</Text>;
}
