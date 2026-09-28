import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import type { Box } from "@xanhtantay/types";
import { colors, shape, type, elevation, useStyles, type Colors } from "../constants/theme";
import { SIZE_LABELS } from "../constants/commerce";
import { formatKg, formatVND } from "../constants/format";
import { PressableScale } from "./motion";
import { SmartImage } from "./SmartImage";
import { Icon } from "./Icon";

type BoxBrief = Pick<Box, "slug" | "name" | "size" | "weight_kg" | "price" | "servings" | "days" | "image_url"> & Partial<Pick<Box, "season" | "description">>;

/** One of the three seasonal boxes: photo, size, weight, servings · days and price. */
export function BoxCard({ box, onPress, style, mediaHeight = 160 }: { box: BoxBrief; onPress?: () => void; style?: StyleProp<ViewStyle>; mediaHeight?: number }) {
  const styles = useStyles(makeStyles);
  const body = (
    <>
      <View style={{ height: mediaHeight }}>
        <SmartImage uri={box.image_url} style={StyleSheet.absoluteFill} loaderSize={28} />
        <View style={styles.sizeChip}>
          <View style={styles.sizeBadge}>
            <Text style={styles.sizeLetter}>{box.size}</Text>
          </View>
          <Text style={styles.sizeText}>{SIZE_LABELS[box.size] ?? box.size}</Text>
        </View>
        {box.season ? (
          <View style={styles.seasonChip}>
            <Icon name="eco" size={12} filled color={colors.onImage} />
            <Text style={styles.seasonText} numberOfLines={1}>{box.season}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 14, gap: 8 }}>
        <Text style={styles.name} numberOfLines={2}>{box.name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Icon name="monitor_weight" size={15} color={colors.onSurfaceVariant} />
            <Text style={styles.metaText}>{formatKg(box.weight_kg)}</Text>
          </View>
          <View style={styles.meta}>
            <Icon name="restaurant" size={15} color={colors.onSurfaceVariant} />
            <Text style={styles.metaText}>
              {box.servings} người ăn · {box.days} ngày
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text style={styles.price}>{formatVND(box.price)}</Text>
          {onPress ? (
            <View style={styles.cta}>
              <Text style={styles.ctaText}>Xem hộp</Text>
              <Icon name="arrow_forward" size={16} color={colors.onPrimary} />
            </View>
          ) : null}
        </View>
      </View>
    </>
  );
  // A disabled PressableScale dims its content, so a card without an action is a plain view.
  if (!onPress) return <View style={[styles.card, elevation[1], style]}>{body}</View>;
  return (
    <PressableScale style={[styles.card, elevation[1], style]} onPress={onPress}>
      {body}
    </PressableScale>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    card: { backgroundColor: c.surfaceContainerLowest, borderRadius: shape.xl, overflow: "hidden" },
    sizeChip: { position: "absolute", left: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surfaceContainerLowest, borderRadius: shape.full, paddingVertical: 4, paddingLeft: 4, paddingRight: 12 },
    sizeBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    sizeLetter: { color: c.onPrimary, fontWeight: "800", fontSize: 13, lineHeight: 16, includeFontPadding: false },
    sizeText: { ...type.labelLarge, color: c.onSurface, fontSize: 12, lineHeight: 16 },
    seasonChip: { position: "absolute", left: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.imageScrim, borderRadius: shape.full, paddingVertical: 4, paddingHorizontal: 10, maxWidth: "80%" },
    seasonText: { color: c.onImage, fontSize: 12, fontWeight: "600", flexShrink: 1 },
    name: { ...type.titleMedium, color: c.onSurface, fontSize: 17 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4 },
    meta: { flexDirection: "row", alignItems: "center", gap: 5 },
    metaText: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13 },
    price: { ...type.headlineSmall, color: c.primary, fontSize: 20, lineHeight: 26 },
    cta: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.primary, borderRadius: shape.full, paddingVertical: 7, paddingHorizontal: 14 },
    ctaText: { ...type.labelLarge, color: c.onPrimary, fontSize: 13, lineHeight: 18 },
  });
