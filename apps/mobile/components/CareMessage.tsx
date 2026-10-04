import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { HeroBlob } from "./motion";
import { Icon } from "./Icon";
import { EmojiText } from "./EmojiText";

/** "Lời nhắn từ quê" — the caring note that comes with every order. On a gift order `label` says it is the sender's own. */
export function CareMessage({ message, label = "Lời nhắn từ quê", style }: { message: string; label?: string; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.card, style]}>
      <HeroBlob size={180} right={-70} top={-90} color={colors.tintOverlay} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon name="favorite" size={20} filled color={colors.onPrimaryContainer} />
        <Text style={styles.eyebrow}>{label}</Text>
      </View>
      <EmojiText style={styles.message}>{message}</EmojiText>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    card: { backgroundColor: c.primaryContainer, borderRadius: shape.xlIncreased, padding: 22, overflow: "hidden" },
    eyebrow: { ...type.labelLarge, color: c.onPrimaryContainer, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
    message: { ...type.titleLarge, color: c.onPrimaryContainer, fontSize: 19, lineHeight: 28, fontWeight: "600" },
  });
