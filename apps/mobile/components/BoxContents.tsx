import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { formatKg } from "../constants/format";
import { storageTips } from "../constants/commerce";
import { AnimIn, PressableScale } from "./motion";
import { SmartImage } from "./SmartImage";
import { Icon } from "./Icon";

export interface ContentLine {
  name: string;
  image_url: string | null;
  /** "rau_la" | "cu_qua": decides the storage guidance under the list */
  category?: string;
  quantity_kg: number;
  farms: { name: string; slug: string; province?: string; location?: string; farmer?: string | null }[];
}

/** What is inside a box: each produce with its weight, photo and the farms that grow it, then how to keep it fresh. */
export function BoxContents({ items, quantity = 1, linkFarms = true }: { items: ContentLine[]; quantity?: number; linkFarms?: boolean }) {
  const styles = useStyles(makeStyles);
  if (!items?.length) return <Text style={styles.muted}>Danh sách rau trong hộp đang được cập nhật theo mùa.</Text>;
  const tips = storageTips(items.map((it) => it.category));
  return (
    <View style={{ gap: 8 }}>
      {items.map((it, i) => (
        <AnimIn key={`${it.name}-${i}`} index={Math.min(i, 6)}>
          <View style={styles.row}>
            <SmartImage uri={it.image_url} style={styles.photo} loaderSize={20} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Text style={styles.name} numberOfLines={1}>{it.name}</Text>
                <Text style={styles.kg}>{formatKg(Number(it.quantity_kg) * quantity)}</Text>
              </View>
              <View style={styles.farms}>
                {it.farms.map((f) => {
                  const place = f.province ?? f.location;
                  const label = (
                    <View style={styles.farmChip}>
                      <Icon name="potted_plant" size={13} filled color={colors.primary} />
                      <Text style={styles.farmText} numberOfLines={1}>
                        {f.name}
                        {place ? ` · ${place}` : ""}
                      </Text>
                    </View>
                  );
                  return linkFarms ? (
                    <PressableScale key={f.slug} scaleTo={0.95} onPress={() => router.push(`/farms/${f.slug}`)}>
                      {label}
                    </PressableScale>
                  ) : (
                    <View key={f.slug}>{label}</View>
                  );
                })}
              </View>
            </View>
          </View>
        </AnimIn>
      ))}
      {tips.length ? (
        <View style={styles.storage}>
          <Text style={styles.storageTitle}>Bảo quản cho rau tươi lâu</Text>
          {tips.map((t) => (
            <View key={t.title} style={styles.tip}>
              <Icon name={t.icon} size={18} filled color={colors.primary} />
              <Text style={styles.tipText}>
                <Text style={styles.tipTitle}>{t.title}: </Text>
                {t.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    muted: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceContainerLowest, borderRadius: shape.lgIncreased, padding: 10, borderWidth: 1, borderColor: c.outlineVariant },
    photo: { width: 64, height: 64, borderRadius: shape.lg },
    name: { ...type.titleMedium, color: c.onSurface, fontSize: 15, flex: 1 },
    kg: { ...type.labelLarge, color: c.primary, fontSize: 15 },
    farms: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
    farmChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.surfaceContainer, borderRadius: shape.full, paddingVertical: 4, paddingHorizontal: 10, maxWidth: 240 },
    farmText: { ...type.labelLarge, color: c.onSurfaceVariant, fontSize: 12, lineHeight: 16, flexShrink: 1 },
    storage: { backgroundColor: c.surfaceContainerLow, borderRadius: shape.lg, padding: 14, gap: 8, marginTop: 4 },
    storageTitle: { ...type.titleMedium, color: c.onSurface, fontSize: 15 },
    tip: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    tipText: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13, lineHeight: 19, flex: 1 },
    tipTitle: { fontWeight: "700", color: c.onSurface },
  });
