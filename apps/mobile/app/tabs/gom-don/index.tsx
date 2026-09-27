import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Modal, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Farm, GroupOrder } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../../constants/api";
import { colors, shape, type, elevation } from "../../../constants/theme";
import { daysUntil } from "../../../constants/format";
import { useSession } from "../../../hooks/useSession";
import { AnimIn, AnimatedProgress, PressableScale, Skeleton } from "../../../components/motion";
import { Button, Chip, EmptyState } from "../../../components/ui";
import { Icon } from "../../../components/Icon";

const isoDay = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

/** Mirrors apps/web/src/app/(customer)/gom-don/page.tsx + CreateGroupDialog. */
export default function GomDonScreen() {
  const { user } = useSession();
  const [groups, setGroups] = useState<GroupOrder[] | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ farm_id: "", title: "", min_members: 5, deadline: isoDay(3), shipping_address: "" });

  const load = useCallback(async () => {
    try {
      const [g, f] = await Promise.all([apiFetch("/groups"), apiFetch("/farms")]);
      setGroups(g);
      setFarms(f);
      setForm((x) => (x.farm_id ? x : { ...x, farm_id: f[0]?.id ?? "" }));
    } catch {
      setGroups((g) => g ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openDialog = () => {
    if (!user) {
      router.push("/dang-nhap?next=/tabs/gom-don");
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    if (!form.farm_id || !form.title.trim() || !form.shipping_address.trim()) {
      Alert.alert("Thiếu thông tin", "Điền tên nhóm, chọn vườn và địa chỉ nhận chung nhé.");
      return;
    }
    setBusy(true);
    try {
      const data = await apiFetch("/groups", { method: "POST", body: JSON.stringify({ ...form, title: form.title.trim(), shipping_address: form.shipping_address.trim(), min_members: Number(form.min_members) }) });
      setOpen(false);
      setForm((x) => ({ ...x, title: "", shipping_address: "" }));
      router.push(`/tabs/gom-don/${data.id}`);
    } catch (e) {
      Alert.alert("Không tạo được nhóm", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={groups ?? []}
        keyExtractor={(g) => g.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.eyebrow}>Mua chung, chia ship</Text>
            <Text style={styles.title}>Gom đơn chung</Text>
            <Text style={styles.subtitle}>Rủ hàng xóm cùng mua để chia ship. Freeship khi nhóm đủ người.</Text>
          </View>
        }
        ListEmptyComponent={
          groups === null ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={130} radius={shape.xl} />
              <Skeleton height={130} radius={shape.xl} />
            </View>
          ) : (
            <EmptyState icon="groups" title="Chưa có nhóm gom đơn nào" description="Hãy là người đầu tiên tạo nhóm cho khu của bạn." action={<Button label="Tạo nhóm mới" icon="add" onPress={openDialog} />} />
          )
        }
        renderItem={({ item: g, index }) => {
          const pct = Math.min(100, Math.round((g.current_members / g.min_members) * 100));
          const freeship = g.current_members >= g.min_members;
          const left = daysUntil(g.deadline);
          return (
            <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 12 }}>
              <PressableScale style={[styles.card, elevation[1]]} onPress={() => router.push(`/tabs/gom-don/${g.id}`)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{g.title}</Text>
                  {freeship ? <Chip icon="local_shipping" label="Freeship" tone="primary" small /> : <Chip label={`Thiếu ${g.min_members - g.current_members}`} small />}
                </View>
                <AnimatedProgress value={pct} wavy={!freeship} color={freeship ? colors.primary : colors.secondary} height={6} track={colors.surfaceContainerHighest} />
                <View style={styles.cardFooter}>
                  <Text style={styles.cardMeta} numberOfLines={1}>{g.current_members}/{g.min_members} người · {g.shipping_address}</Text>
                  <Text style={[styles.cardDeadline, left <= 1 && { color: colors.error }]}>{left > 0 ? `Còn ${left} ngày` : "Chốt hôm nay"}</Text>
                </View>
              </PressableScale>
            </AnimIn>
          );
        }}
      />

      {(groups?.length ?? 0) > 0 && (
        <AnimIn style={styles.fabWrap}>
          <PressableScale haptic style={[styles.fab, elevation[3]]} onPress={openDialog}>
            <Text style={styles.fabText}>＋ Tạo nhóm mới</Text>
          </PressableScale>
        </AnimIn>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.scrim}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={styles.dialogIcon}>
                  <Icon name="groups" size={22} />
                </View>
                <View>
                  <Text style={styles.sheetTitle}>Tạo nhóm gom đơn</Text>
                  <Text style={styles.subtitle}>Đủ người là cả nhóm được freeship</Text>
                </View>
              </View>

              <Text style={styles.label}>Vườn rau</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {farms.map((f) => <Chip key={f.id} label={f.name} selected={form.farm_id === f.id} onPress={() => setForm({ ...form, farm_id: f.id })} />)}
              </ScrollView>

              <Text style={styles.label}>Tên nhóm</Text>
              <TextInput style={styles.input} placeholder="Ví dụ: Rau sạch chung cư Sunrise" placeholderTextColor={colors.onSurfaceVariant} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} maxLength={80} />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Số người tối thiểu</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => setForm({ ...form, min_members: Math.max(2, form.min_members - 1) })}>
                      <Text style={styles.stepBtnText}>–</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepValue}>{form.min_members}</Text>
                    <TouchableOpacity style={[styles.stepBtn, { backgroundColor: colors.primary }]} onPress={() => setForm({ ...form, min_members: Math.min(50, form.min_members + 1) })}>
                      <Text style={[styles.stepBtnText, { color: colors.onPrimary }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Hạn chốt</Text>
                  <TextInput style={styles.input} value={form.deadline} onChangeText={(v) => setForm({ ...form, deadline: v })} placeholder="YYYY-MM-DD" placeholderTextColor={colors.onSurfaceVariant} autoCapitalize="none" />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {[1, 3, 7, 14].map((d) => <Chip key={d} label={`+${d} ngày`} small selected={form.deadline === isoDay(d)} onPress={() => setForm({ ...form, deadline: isoDay(d) })} />)}
              </View>

              <Text style={styles.label}>Địa chỉ nhận chung</Text>
              <TextInput style={styles.input} placeholder="Sảnh chung cư, số nhà, phường…" placeholderTextColor={colors.onSurfaceVariant} value={form.shipping_address} onChangeText={(v) => setForm({ ...form, shipping_address: v })} maxLength={160} />

              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <Button label="Huỷ" variant="text" onPress={() => setOpen(false)} />
                <Button label="Tạo nhóm" icon="rocket_launch" onPress={submit} loading={busy} disabled={!farms.length} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  eyebrow: { ...type.labelLarge, color: colors.primary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  title: { ...type.headlineSmall, color: colors.onSurface },
  subtitle: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 2, fontSize: 13 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 18 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 },
  cardTitle: { ...type.titleMedium, color: colors.onSurface, flex: 1, fontSize: 16 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 8 },
  cardMeta: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, flex: 1 },
  cardDeadline: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, fontWeight: "700" },
  fabWrap: { position: "absolute", right: 16, bottom: 20 },
  fab: { backgroundColor: colors.primary, borderRadius: shape.full, paddingVertical: 14, paddingHorizontal: 20 },
  fabText: { ...type.labelLarge, color: colors.onPrimary, fontSize: 15 },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: shape.xlIncreased, borderTopRightRadius: shape.xlIncreased, padding: 22, paddingBottom: 34, maxHeight: "90%" },
  dialogIcon: { width: 48, height: 48, borderRadius: shape.md, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
  sheetTitle: { ...type.headlineSmall, color: colors.onSurface, fontSize: 20 },
  label: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 },
  input: { backgroundColor: colors.surfaceContainer, borderRadius: shape.md, padding: 13, color: colors.onSurface, fontSize: 15, borderWidth: 1, borderColor: colors.outlineVariant },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryContainer, borderRadius: shape.full, padding: 4 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceContainerLowest, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 20, fontWeight: "700", color: colors.onSurface, lineHeight: 22 },
  stepValue: { flex: 1, textAlign: "center", ...type.labelLarge, color: colors.onPrimaryContainer, fontSize: 16 },
});
