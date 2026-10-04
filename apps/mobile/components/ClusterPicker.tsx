import { useState } from "react";
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Cluster } from "@xanhtantay/types";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { PressableScale } from "./motion";
import { Icon } from "./Icon";

/** "Điểm nhận" field that opens a bottom sheet listing the pilot pickup points (dormitories, areas of rented rooms). */
export function ClusterPicker({ clusters, value, onChange, placeholder = "Chọn ký túc xá hoặc khu trọ" }: { clusters: Cluster[]; value: string | null; onChange: (id: string) => void; placeholder?: string }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = clusters.find((c) => c.id === value) ?? null;

  return (
    <>
      <PressableScale scaleTo={0.98} style={styles.field} onPress={() => setOpen(true)}>
        <Icon name="apartment" size={22} color={colors.primary} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <>
              <Text style={styles.name} numberOfLines={1}>{selected.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {selected.address} · {selected.district}
              </Text>
            </>
          ) : (
            <Text style={styles.placeholder}>{clusters.length ? placeholder : "Đang tải danh sách điểm nhận…"}</Text>
          )}
        </View>
        <Icon name="expand_more" size={22} color={colors.onSurfaceVariant} />
      </PressableScale>

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.handle} />
            <Text style={styles.title}>Điểm nhận rau</Text>
            <Text style={styles.sub}>Hộp rau được giao tới ký túc xá, khu trọ lúc 16h00 thứ Tư và Chủ nhật.</Text>
            <ScrollView style={{ marginTop: 14 }} contentContainerStyle={{ gap: 8 }}>
              {clusters.map((c) => {
                const sel = c.id === value;
                return (
                  <PressableScale
                    key={c.id}
                    haptic
                    scaleTo={0.98}
                    style={[styles.option, sel && styles.optionSelected]}
                    onPress={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                  >
                    <Icon name={sel ? "check_circle" : "apartment"} size={22} filled={sel} color={sel ? colors.primary : colors.onSurfaceVariant} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.name}>{c.name}</Text>
                      <Text style={styles.sub}>
                        {c.address} · {c.district}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
              {clusters.length === 0 && <Text style={styles.sub}>Chưa có điểm nhận nào trong khu vực thí điểm.</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    field: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceContainer, borderRadius: shape.md, borderWidth: 1, borderColor: c.outlineVariant, paddingVertical: 10, paddingHorizontal: 13, minHeight: 56 },
    name: { ...type.titleMedium, color: c.onSurface, fontSize: 15, lineHeight: 20 },
    sub: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 12, lineHeight: 17 },
    placeholder: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 15 },
    scrim: { flex: 1, backgroundColor: c.scrim, justifyContent: "flex-end" },
    sheet: { backgroundColor: c.surfaceContainerLowest, borderTopLeftRadius: shape.xlIncreased, borderTopRightRadius: shape.xlIncreased, padding: 22, paddingTop: 10, maxHeight: "80%" },
    handle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: c.outlineVariant, marginBottom: 14 },
    title: { ...type.headlineSmall, color: c.onSurface, fontSize: 20, lineHeight: 26 },
    option: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceContainerLow, borderRadius: shape.lg, padding: 14, borderWidth: 1.5, borderColor: "transparent" },
    optionSelected: { backgroundColor: c.primaryContainer, borderColor: c.primary },
  });
