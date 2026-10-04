import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Modal, Pressable, Platform } from "react-native";
import { KeyboardPad } from "../../components/keyboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import type { Subscription, SubscriptionFrequency } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, elevation, useStyles, type Colors } from "../../constants/theme";
import { FREQUENCIES, FREQUENCY_ICONS, FREQUENCY_LABELS, SIZE_LABELS, canMoveDelivery, shipFeeFor } from "../../constants/commerce";
import { formatDay, formatVND } from "../../constants/format";
import { useLiveRefresh } from "../../hooks/useLive";
import { AnimIn, PressableScale, Skeleton } from "../../components/motion";
import { Button, Chip, EmptyState, PageHeader } from "../../components/ui";
import { SmartImage } from "../../components/SmartImage";
import { QuantityStepper } from "../../components/QuantityStepper";
import { DeliveryDatePicker } from "../../components/DeliveryDatePicker";
import { useDialog } from "../../components/Dialog";
import { Icon } from "../../components/Icon";

/** "Gói định kỳ": boxes that order themselves every period. Quantity, frequency, pause / resume, and moving the next box to another delivery day. */
export default function DinhKyScreen() {
  const { alert } = useDialog();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [subs, setSubs] = useState<Subscription[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [frequency, setFrequency] = useState<SubscriptionFrequency>("weekly");
  // The next box may be moved to another delivery day; `earliest` is the first one still open (`GET /boxes`).
  const [nextDay, setNextDay] = useState<string | null>(null);
  const [earliest, setEarliest] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSubs(await apiFetch("/subscriptions"));
    } catch {
      setSubs((s) => s ?? []);
    }
    apiFetch("/boxes")
      .then((r: { delivery_date?: string }) => r?.delivery_date && setEarliest(r.delivery_date))
      .catch(() => {});
  }, []);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const patch = async (id: string, body: Partial<Pick<Subscription, "active" | "quantity" | "frequency" | "next_delivery">>) => {
    setBusy(id);
    try {
      await apiFetch("/subscriptions", { method: "PATCH", body: JSON.stringify({ id, ...body }) });
      setSubs((xs) => (xs ?? []).map((x) => (x.id === id ? { ...x, ...body } : x)));
      load();
      return true;
    } catch (e) {
      alert("Không cập nhật được", e instanceof ApiError ? e.message : "Có lỗi xảy ra, xin thử lại giúp ạ.");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (s: Subscription) => {
    if (await patch(s.id, { active: !s.active })) alert(s.active ? "Đã tạm dừng gói" : "Gói đã chạy lại", s.active ? "Bật lại bất cứ lúc nào, nhà vườn sẽ không cắt rau cho gói này trong lúc tạm dừng." : "Hộp rau sẽ tự lên đơn vào kỳ giao kế tiếp.");
  };

  const openEdit = (s: Subscription) => {
    setQuantity(s.quantity);
    setFrequency(s.frequency);
    setNextDay(s.next_delivery);
    setEditing(s);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const moved = nextDay && nextDay !== editing.next_delivery ? { next_delivery: nextDay } : {};
    if (await patch(editing.id, { quantity, frequency, ...moved })) setEditing(null);
  };
  // Allowed while the subscription runs, until 24 hours before the cut-off of the box being moved.
  const movable = !!editing && editing.active && canMoveDelivery(editing.next_delivery);

  return (
    <>
      <FlatList
        style={styles.container}
        data={subs ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }}
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
        ListHeaderComponent={<PageHeader icon="event_repeat" eyebrow="Tự động, đúng hẹn" title="Gói định kỳ" subtitle="Hộp rau tự lên đơn mỗi kỳ, giao thứ Tư hoặc Chủ nhật. Tạm dừng hay dời ngày giao trước giờ chốt sổ 24 giờ." />}
        ListEmptyComponent={
          subs === null ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={190} radius={shape.xl} />
              <Skeleton height={190} radius={shape.xl} />
            </View>
          ) : (
            <EmptyState icon="event_repeat" title="Chưa có gói định kỳ nào" description="Chọn một hộp rau rồi bấm “Gói định kỳ” để nhận rau mỗi tuần, hai tuần hoặc mỗi tháng." action={<Button label="Chọn hộp rau" icon="inventory_2" onPress={() => router.push("/tabs/hop-rau")} />} />
          )
        }
        renderItem={({ item: s, index }) => (
          <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 14 }}>
            <View style={[styles.card, elevation[1], !s.active && { opacity: 0.8 }]}>
              <PressableScale scaleTo={0.985} style={styles.header} onPress={() => s.box && router.push(`/hop-rau/${s.box.slug}`)}>
                <SmartImage uri={s.box?.image_url} style={styles.photo} loaderSize={20} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.boxName} numberOfLines={2}>{s.box?.name ?? "Hộp rau"}</Text>
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {s.box ? <Chip label={SIZE_LABELS[s.box.size] ?? s.box.size} small /> : null}
                    <Chip icon={s.active ? "check_circle" : "pause_circle"} label={s.active ? "Đang chạy" : "Đã tạm dừng"} tone={s.active ? "primary" : "error"} small />
                  </View>
                </View>
              </PressableScale>

              <View style={styles.facts}>
                <Fact icon={FREQUENCY_ICONS[s.frequency] ?? "event_repeat"} label="Tần suất" value={FREQUENCY_LABELS[s.frequency] ?? s.frequency} />
                <Fact icon="inventory_2" label="Số lượng" value={`${s.quantity} hộp mỗi kỳ`} />
                <Fact icon="event" label={s.active ? "Kỳ giao tới" : "Kỳ giao khi bật lại"} value={formatDay(s.next_delivery)} />
                {s.cluster ? <Fact icon="apartment" label="Điểm nhận" value={`${s.cluster.name}${s.address ? ` · ${s.address}` : ""}`} /> : null}
                {s.recipient_name ? <Fact icon="favorite" label="Người nhận" value={`${s.recipient_name}${s.recipient_phone ? ` · ${s.recipient_phone}` : ""}`} /> : null}
                {s.box ? <Fact icon="payments" label="Mỗi kỳ" value={`${formatVND(s.box.price * s.quantity + shipFeeFor(s.box.size, s.quantity))} · gồm ${formatVND(shipFeeFor(s.box.size, s.quantity))} phí giao`} /> : null}
              </View>

              <View style={styles.actions}>
                <Button label="Đổi số lượng, ngày giao" icon="tune" variant="outlined" small onPress={() => openEdit(s)} disabled={busy === s.id} />
                <Button label={s.active ? "Tạm dừng" : "Chạy lại"} icon={s.active ? "pause_circle" : "play_circle"} variant={s.active ? "error" : "tonal"} small loading={busy === s.id && !editing} onPress={() => toggleActive(s)} />
              </View>
            </View>
          </AnimIn>
        )}
      />

      <Modal visible={!!editing} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setEditing(null)}>
        <KeyboardPad style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(null)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={styles.sheetIcon}>
                <Icon name="tune" size={22} color={colors.onPrimaryContainer} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Đổi gói định kỳ</Text>
                <Text style={styles.muted} numberOfLines={1}>{editing?.box?.name ?? "Hộp rau"}</Text>
              </View>
            </View>

            <Text style={styles.label}>Số hộp mỗi kỳ</Text>
            <QuantityStepper value={quantity} onChange={setQuantity} />

            <Text style={styles.label}>Tần suất giao</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {FREQUENCIES.map((f) => (
                <Chip key={f} label={FREQUENCY_LABELS[f]} icon={frequency === f ? "check" : undefined} selected={frequency === f} onPress={() => setFrequency(f)} />
              ))}
            </View>

            <Text style={styles.label}>Dời kỳ giao tới</Text>
            {movable && earliest && nextDay ? (
              <DeliveryDatePicker earliest={earliest} value={nextDay} onChange={setNextDay} days={28} hint="Dời sang thứ Tư hoặc Chủ nhật khác trong 4 tuần tới. Các kỳ sau tính tiếp từ ngày mới." />
            ) : (
              <Text style={styles.muted}>{editing && !editing.active ? "Gói đang tạm dừng, bật lại rồi mới dời ngày giao được." : movable ? "Đang tải các ngày giao…" : "Chỉ dời được ngày giao trước giờ chốt sổ ít nhất 24 giờ."}</Text>
            )}

            {editing?.box ? (
              <Text style={[styles.muted, { marginTop: 16 }]}>
                Mỗi kỳ <Text style={{ fontWeight: "800", color: colors.primary }}>{formatVND(editing.box.price * quantity + shipFeeFor(editing.box.size, quantity))}</Text>, gồm {formatVND(shipFeeFor(editing.box.size, quantity))} phí giao. Thay đổi áp dụng từ kỳ giao kế tiếp chưa chốt sổ.
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 20, alignItems: "center" }}>
              <Button label="Huỷ" variant="text" onPress={() => setEditing(null)} />
              <Button label="Lưu thay đổi" icon="check" onPress={saveEdit} loading={!!editing && busy === editing.id} />
            </View>
          </View>
        </KeyboardPad>
      </Modal>
    </>
  );
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={18} color={colors.onSurfaceVariant} />
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    muted: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },
    card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.xl, padding: 18 },
    header: { flexDirection: "row", alignItems: "center", gap: 14 },
    photo: { width: 72, height: 72, borderRadius: shape.lg },
    boxName: { ...type.titleLarge, color: colors.onSurface, fontSize: 18, lineHeight: 24 },
    facts: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.md, padding: 12, marginTop: 14, gap: 8 },
    fact: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    factLabel: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13, width: 96 },
    factValue: { ...type.labelLarge, color: colors.onSurface, fontSize: 13, flex: 1 },
    actions: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" },
    scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: shape.xlIncreased, borderTopRightRadius: shape.xlIncreased, padding: 22 },
    sheetIcon: { width: 48, height: 48, borderRadius: shape.md, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
    sheetTitle: { ...type.headlineSmall, color: colors.onSurface, fontSize: 20, lineHeight: 26 },
    label: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 18, marginBottom: 8 },
  });
