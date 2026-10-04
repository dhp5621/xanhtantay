import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import type { GroupOrder } from "@xanhtantay/types";
import { colors, shape, type, elevation, useStyles, type Colors } from "../constants/theme";
import { formatDay } from "../constants/format";
import { AnimatedProgress, PressableScale } from "./motion";
import { Chip } from "./ui";
import { Icon } from "./Icon";
import { EmojiText } from "./EmojiText";

/** An open group order of one pickup point with its progress towards free delivery. */
export function GroupCard({ group, mine, onPress, style }: { group: GroupOrder; mine?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles(makeStyles);
  const reached = group.current_members >= group.min_members;
  const pct = Math.min(100, Math.round((group.current_members / Math.max(1, group.min_members)) * 100));
  const body = (
    <>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <EmojiText style={styles.title} numberOfLines={1}>{group.title}</EmojiText>
          <Text style={styles.meta} numberOfLines={1}>
            {group.box?.name ?? "Hộp rau"}
            {group.cluster ? ` · ${group.cluster.name}` : ""}
          </Text>
        </View>
        {reached ? <Chip icon="local_shipping" label="Miễn phí giao" tone="primary" small /> : <Chip label={`Thiếu ${group.min_members - group.current_members} người`} small />}
      </View>
      <AnimatedProgress value={pct} wavy={!reached} color={reached ? colors.primary : colors.secondary} height={6} track={colors.surfaceContainerHighest} />
      <View style={styles.footer}>
        <Text style={styles.meta}>
          {group.current_members}/{group.min_members} nhà tham gia
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Icon name="event" size={13} color={colors.onSurfaceVariant} />
          <Text style={[styles.meta, { fontWeight: "700" }]}>Giao {formatDay(group.delivery_date)}</Text>
        </View>
      </View>
      {mine ? (
        <View style={styles.mine}>
          <Icon name="apartment" size={13} color={colors.primary} />
          <Text style={styles.mineText}>Điểm nhận của bạn</Text>
        </View>
      ) : null}
    </>
  );
  if (!onPress) return <View style={[styles.card, elevation[1], style]}>{body}</View>;
  return (
    <PressableScale style={[styles.card, elevation[1], style]} onPress={onPress}>
      {body}
    </PressableScale>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    card: { backgroundColor: c.surfaceContainerLowest, borderRadius: shape.xl, padding: 18 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 8 },
    title: { ...type.titleMedium, color: c.onSurface, fontSize: 16 },
    meta: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 12, flexShrink: 1 },
    footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8 },
    mine: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
    mineText: { ...type.labelLarge, color: c.primary, fontSize: 12 },
  });
