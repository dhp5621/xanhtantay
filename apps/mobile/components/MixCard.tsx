import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { colors, shape, type, elevation, useStyles, type Colors } from "../constants/theme";
import { mainSize, type Mix } from "../constants/commerce";
import { PressableScale } from "./motion";
import { SmartImage } from "./SmartImage";
import { SizePicker } from "./SizePicker";
import { Icon } from "./Icon";

/** One mix of vegetables, offered in sizes the way clothing is: pick the mix, then S, M or L. */
export function MixCard({ mix, onOpen, style, mediaHeight = 160 }: { mix: Mix; onOpen: (slug: string) => void; style?: StyleProp<ViewStyle>; mediaHeight?: number }) {
  const styles = useStyles(makeStyles);
  const main = mainSize(mix.sizes);
  if (!main) return null;
  return (
    <View style={[styles.card, elevation[1], style]}>
      <PressableScale scaleTo={0.985} onPress={() => onOpen(main.slug)} accessibilityRole="button" accessibilityLabel={`${mix.name}, xem size ${main.size}`}>
        <View style={{ height: mediaHeight }}>
          <SmartImage uri={mix.image_url} style={StyleSheet.absoluteFill} loaderSize={28} />
          {mix.season ? (
            <View style={styles.seasonChip}>
              <Icon name="eco" size={12} filled color={colors.onImage} />
              <Text style={styles.seasonText} numberOfLines={1}>{mix.season}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ padding: 14, paddingBottom: 0, gap: 8 }}>
          <Text style={styles.name} numberOfLines={2}>{mix.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.meta}>
              <Icon name="calendar_month" size={15} color={colors.onSurfaceVariant} />
              <Text style={styles.metaText}>
                {main.days} ngày · {main.days * 2} bữa
              </Text>
            </View>
            {mix.items.length > 0 && (
              <View style={styles.meta}>
                <Icon name="eco" size={15} color={colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{mix.items.length} loại</Text>
              </View>
            )}
          </View>
          {mix.items.length > 0 && (
            <Text style={styles.metaText} numberOfLines={2}>{mix.items.map((i) => i.name).join(" · ")}</Text>
          )}
        </View>
      </PressableScale>
      <SizePicker mixName={mix.name} sizes={mix.sizes} onPick={(b) => onOpen(b.slug)} style={{ padding: 14 }} />
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    card: { backgroundColor: c.surfaceContainerLowest, borderRadius: shape.xl, overflow: "hidden" },
    seasonChip: { position: "absolute", left: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.imageScrim, borderRadius: shape.full, paddingVertical: 4, paddingHorizontal: 10, maxWidth: "80%" },
    seasonText: { color: c.onImage, fontSize: 12, fontWeight: "600", flexShrink: 1 },
    name: { ...type.titleMedium, color: c.onSurface, fontSize: 17 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4 },
    meta: { flexDirection: "row", alignItems: "center", gap: 5 },
    metaText: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13 },
  });
