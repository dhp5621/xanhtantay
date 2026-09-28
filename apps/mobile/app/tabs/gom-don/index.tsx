import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Modal, TextInput, ScrollView, Platform, Pressable } from "react-native";
import { KeyboardPad, KeyboardScroll } from "../../../components/keyboard";
import { DeliveryDatePicker } from "../../../components/DeliveryDatePicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import type { Cluster, GroupOrder } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../../constants/api";
import { colors, shape, type, elevation, useStyles, type Colors } from "../../../constants/theme";
import { GROUP_MIN_MEMBERS, SIZE_LABELS } from "../../../constants/commerce";
import { formatDay, formatVND } from "../../../constants/format";
import type { BoxesResponse, Me } from "../../../constants/types";
import { useLiveRefresh } from "../../../hooks/useLive";
import { AnimIn, PressableScale, Skeleton } from "../../../components/motion";
import { Button, Chip, EmptyState } from "../../../components/ui";
import { GroupCard } from "../../../components/GroupCard";
import { ClusterPicker } from "../../../components/ClusterPicker";
import { QuantityStepper } from "../../../components/QuantityStepper";
import { useDialog } from "../../../components/Dialog";
import { Icon } from "../../../components/Icon";

type Scope = "mine" | "all";

/** "Gom đơn chung": group orders per apartment cluster; enough homes at cut-off means free delivery for all. */
export default function GomDonScreen() {
  const { alert } = useDialog();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<Scope>("mine");
  const [groups, setGroups] = useState<GroupOrder[] | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [catalog, setCatalog] = useState<BoxesResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ box_id: string; cluster_id: string | null; title: string; min_members: number; quantity: number; address: string; delivery_date?: string }>({ box_id: "", cluster_id: null, title: "", min_members: GROUP_MIN_MEMBERS.default, quantity: 1, address: "" });

  const load = useCallback(async () => {
    try {
      const profile: Me | null = await apiFetch("/users/me").catch(() => null);
      setMe(profile);
      const mine = scope === "mine" && profile?.cluster_id ? `?cluster_id=${encodeURIComponent(profile.cluster_id)}` : "";
      const rows: GroupOrder[] = await apiFetch(`/groups${mine}`);
      // Without a saved building "mine" has nothing to filter by, so it shows nothing rather than everything.
      setGroups(scope === "mine" && !profile?.cluster_id ? [] : rows ?? []);
      setForm((x) => ({ ...x, cluster_id: x.cluster_id ?? profile?.cluster_id ?? null, address: x.address || profile?.address || "" }));
    } catch {
      setGroups((g) => g ?? []);
    }
  }, [scope]);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openDialog = async () => {
    setOpen(true);
    try {
      const [c, b]: [Cluster[], BoxesResponse] = await Promise.all([apiFetch("/clusters"), apiFetch("/boxes")]);
      setClusters(c ?? []);
      setCatalog(b);
      setForm((x) => (x.box_id ? x : { ...x, box_id: b.boxes.find((k) => k.active !== false)?.id ?? "" }));
    } catch {
      // the sheet shows its own empty states
    }
  };

  const boxes = (catalog?.boxes ?? []).filter((b) => b.active !== false);
  const box = boxes.find((b) => b.id === form.box_id) ?? null;
  const cluster = clusters.find((c) => c.id === form.cluster_id) ?? null;
  // Earliest open day by default; a day that has since closed falls back to it.
  const deliveryDate = catalog ? (form.delivery_date && form.delivery_date >= catalog.delivery_date ? form.delivery_date : catalog.delivery_date) : null;
  const defaultTitle = box ? `Gom ${box.name}${cluster ? ` · ${cluster.name}` : ""}` : "";

  const submit = async () => {
    if (!form.box_id || !form.cluster_id) {
      alert("Thiếu thông tin", "Bạn chọn hộp rau và cụm chung cư nhận hàng nhé.");
      return;
    }
    setBusy(true);
    try {
      const data: GroupOrder = await apiFetch("/groups", {
        method: "POST",
        body: JSON.stringify({
          box_id: form.box_id,
          cluster_id: form.cluster_id,
          title: form.title.trim() || defaultTitle,
          min_members: form.min_members,
          delivery_date: deliveryDate ?? undefined,
          quantity: form.quantity,
          address: form.address.trim() || undefined,
        }),
      });
      setOpen(false);
      setForm((x) => ({ ...x, title: "" }));
      router.push(`/tabs/gom-don/${data.id}`);
    } catch (e) {
      alert("Không tạo được nhóm", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  const noCluster = scope === "mine" && !!me && !me.cluster_id;

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
            <Text style={styles.eyebrow}>Cùng toà nhà, chung một chuyến xe</Text>
            <Text style={styles.title}>Gom đơn chung</Text>
            <Text style={styles.subtitle}>Rủ hàng xóm cùng đặt hộp rau. Đủ số nhà lúc chốt sổ 18h00 là cả nhóm miễn phí giao.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              <Chip
                icon={scope === "mine" ? "check" : "apartment"}
                label={me?.cluster?.name ? `Toà nhà của tôi · ${me.cluster.name}` : "Toà nhà của tôi"}
                selected={scope === "mine"}
                onPress={() => {
                  setGroups(null);
                  setScope("mine");
                }}
              />
              <Chip
                icon={scope === "all" ? "check" : "public"}
                label="Tất cả"
                selected={scope === "all"}
                onPress={() => {
                  setGroups(null);
                  setScope("all");
                }}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          groups === null ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={140} radius={shape.xl} />
              <Skeleton height={140} radius={shape.xl} />
            </View>
          ) : noCluster ? (
            <EmptyState icon="apartment" title="Bạn chưa chọn toà nhà" description="Lưu cụm chung cư trong mục Tài khoản để thấy các nhóm của hàng xóm." action={<Button label="Chọn cụm chung cư" icon="apartment" onPress={() => router.push("/tabs/tai-khoan")} />} />
          ) : (
            <EmptyState
              icon="groups"
              title={scope === "mine" ? "Toà nhà bạn chưa có nhóm nào" : "Chưa có nhóm gom đơn nào"}
              description="Hãy là người mở nhóm đầu tiên, hàng xóm vào cùng là cả nhà miễn phí giao."
              action={<Button label="Tạo nhóm mới" icon="add" onPress={openDialog} />}
            />
          )
        }
        renderItem={({ item: g, index }) => (
          <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 12 }}>
            <GroupCard group={g} mine={scope === "all" && !!me?.cluster_id && g.cluster_id === me.cluster_id} onPress={() => router.push(`/tabs/gom-don/${g.id}`)} />
          </AnimIn>
        )}
      />

      {(groups?.length ?? 0) > 0 && (
        <AnimIn style={styles.fabWrap}>
          <PressableScale haptic style={[styles.fab, elevation[3]]} onPress={openDialog}>
            <Icon name="add" size={20} color={colors.onPrimary} />
            <Text style={styles.fabText}>Tạo nhóm mới</Text>
          </PressableScale>
        </AnimIn>
      )}

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <KeyboardPad style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
            <KeyboardScroll pad={false} containerStyle={{ flex: 0, flexShrink: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={styles.dialogIcon}>
                  <Icon name="groups" size={22} color={colors.onPrimaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>Tạo nhóm gom đơn</Text>
                  <Text style={styles.subtitle}>Đủ số nhà là cả nhóm miễn phí giao</Text>
                </View>
              </View>

              <Text style={styles.label}>Hộp rau</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {boxes.map((b) => (
                  <Chip key={b.id} label={`${b.mix_name || b.name} · ${b.size} · ${formatVND(b.price)}`} icon={form.box_id === b.id ? "check" : "inventory_2"} selected={form.box_id === b.id} onPress={() => setForm({ ...form, box_id: b.id })} />
                ))}
              </ScrollView>
              {box ? <Text style={[styles.subtitle, { marginTop: 6 }]}>{box.name}</Text> : !catalog ? <Text style={[styles.subtitle, { marginTop: 6 }]}>Đang tải các hộp rau…</Text> : null}

              <Text style={styles.label}>Cụm chung cư</Text>
              <ClusterPicker clusters={clusters} value={form.cluster_id} onChange={(id) => setForm({ ...form, cluster_id: id })} />

              <Text style={styles.label}>Tên nhóm</Text>
              <TextInput style={styles.input} placeholder={defaultTitle || "Ví dụ: Rau sạch toà S2"} placeholderTextColor={colors.onSurfaceVariant} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} maxLength={80} />

              <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
                <View>
                  <Text style={styles.label}>Số nhà tối thiểu</Text>
                  <QuantityStepper value={form.min_members} onChange={(n) => setForm((x) => ({ ...x, min_members: n }))} min={GROUP_MIN_MEMBERS.min} max={GROUP_MIN_MEMBERS.max} unit="nhà" />
                </View>
                <View>
                  <Text style={styles.label}>Phần của bạn</Text>
                  <QuantityStepper value={form.quantity} onChange={(n) => setForm((x) => ({ ...x, quantity: n }))} />
                </View>
              </View>

              <Text style={styles.label}>Toà, tầng, số căn hộ của bạn</Text>
              <TextInput style={styles.input} placeholder="Ví dụ: Toà S2, căn 1508" placeholderTextColor={colors.onSurfaceVariant} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} maxLength={160} />

              {catalog && deliveryDate ? (
                <>
                  <Text style={styles.label}>Ngày giao</Text>
                  <DeliveryDatePicker earliest={catalog.delivery_date} value={deliveryDate} onChange={(d) => setForm((x) => ({ ...x, delivery_date: d }))} />
                  <View style={styles.dateRow}>
                    <Icon name="event" size={16} color={colors.primary} />
                    <Text style={styles.dateText}>Giao {formatDay(deliveryDate)}, 16h00 tại sảnh</Text>
                  </View>
                </>
              ) : null}

              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 18, alignItems: "center" }}>
                <Button label="Huỷ" variant="text" onPress={() => setOpen(false)} />
                <Button label="Tạo nhóm" icon="rocket_launch" onPress={submit} loading={busy} disabled={!boxes.length} />
              </View>
            </KeyboardScroll>
          </View>
        </KeyboardPad>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    eyebrow: { ...type.labelLarge, color: colors.primary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
    title: { ...type.headlineSmall, color: colors.onSurface },
    subtitle: { ...type.bodyMedium, color: colors.onSurfaceVariant, marginTop: 2, fontSize: 13 },
    fabWrap: { position: "absolute", right: 16, bottom: 20 },
    fab: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, borderRadius: shape.full, paddingVertical: 14, paddingHorizontal: 20 },
    fabText: { ...type.labelLarge, color: colors.onPrimary, fontSize: 15 },
    scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: shape.xlIncreased, borderTopRightRadius: shape.xlIncreased, padding: 22, maxHeight: "90%" },
    dialogIcon: { width: 48, height: 48, borderRadius: shape.md, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
    sheetTitle: { ...type.headlineSmall, color: colors.onSurface, fontSize: 20 },
    label: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 16, marginBottom: 6 },
    input: { backgroundColor: colors.surfaceContainer, borderRadius: shape.md, padding: 13, color: colors.onSurface, fontSize: 15, borderWidth: 1, borderColor: colors.outlineVariant },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
    dateText: { ...type.labelLarge, color: colors.primary, fontSize: 13, flex: 1 },
  });
