import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { DeliveryDatePicker } from "./DeliveryDatePicker";
import { router } from "expo-router";
import type { Box, Cluster, GroupOrder, SubscriptionFrequency } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../constants/api";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { FREQUENCIES, FREQUENCY_LABELS, GROUP_MIN_MEMBERS, ORDER_MODES, SHIP_FEE, shipFeeFor, type OrderMode } from "../constants/commerce";
import { formatDay, formatVND } from "../constants/format";
import type { Me, PlacedOrder } from "../constants/types";
import { useLiveRefresh } from "../hooks/useLive";
import { useAddress } from "../hooks/useAddress";
import { AnimIn, AnimatedProgress, PressableScale } from "./motion";
import { Button, Chip } from "./ui";
import { Icon } from "./Icon";
import { Loader } from "./Loader";
import { useDialog } from "./Dialog";
import { QuantityStepper } from "./QuantityStepper";
import { ClusterPicker } from "./ClusterPicker";
import { EmojiText } from "./EmojiText";

/**
 * Order panel of a box: buy once, subscribe, or buy together with the building.
 * One-off orders hand the created order back through `onPlaced` (the screen shows the care message);
 * subscriptions and groups navigate to their own screens.
 */
export function OrderPanel({ box, deliveryDate, shipFee = SHIP_FEE, initialMode = "single", onPlaced }: { box: Box; deliveryDate: string | null; shipFee?: number; initialMode?: OrderMode; onPlaced: (order: PlacedOrder) => void }) {
  const styles = useStyles(makeStyles);
  const { alert } = useDialog();
  const { pronoun, Pronoun } = useAddress();
  const [mode, setMode] = useState<OrderMode>(initialMode);
  const [quantity, setQuantity] = useState(1);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [clusterId, setClusterId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [frequency, setFrequency] = useState<SubscriptionFrequency>("weekly");
  const [groups, setGroups] = useState<GroupOrder[] | null>(null);
  const [groupTitle, setGroupTitle] = useState("");
  const [minMembers, setMinMembers] = useState<number>(GROUP_MIN_MEMBERS.default);
  // A new group may be delivered on a later day than the earliest open one.
  const [groupDate, setGroupDate] = useState<string | null>(null);
  const groupDay = deliveryDate ? (groupDate && groupDate >= deliveryDate ? groupDate : deliveryDate) : null;
  const [busy, setBusy] = useState<string | null>(null);

  // Cluster list + the address saved on the account as the default delivery point.
  useEffect(() => {
    let alive = true;
    apiFetch("/clusters")
      .then((rows: Cluster[]) => alive && setClusters(rows ?? []))
      .catch(() => {});
    apiFetch("/users/me")
      .then((me: Me) => {
        if (!alive || !me) return;
        setClusterId((c) => c ?? me.cluster_id ?? null);
        setAddress((a) => a || me.address || "");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const loadGroups = useCallback(async () => {
    if (mode !== "group" || !clusterId) return;
    try {
      const rows: GroupOrder[] = await apiFetch(`/groups?cluster_id=${encodeURIComponent(clusterId)}`);
      setGroups((rows ?? []).filter((g) => g.box_id === box.id && g.status === "open"));
    } catch {
      setGroups((g) => g ?? []);
    }
  }, [mode, clusterId, box.id]);

  useEffect(() => {
    setGroups(null);
    loadGroups();
  }, [loadGroups]);
  useLiveRefresh(loadGroups);

  const cluster = clusters.find((c) => c.id === clusterId) ?? null;
  const subtotal = box.price * quantity;
  const fee = shipFeeFor(mode, { fee: shipFee });
  const total = subtotal + fee;

  const requireCluster = () => {
    if (clusterId) return true;
    alert("Chọn cụm chung cư", `Hộp rau được giao tới sảnh toà nhà, ${pronoun} chọn cụm chung cư của mình trước nhé.`, undefined, { icon: "apartment" });
    return false;
  };

  const fail = (title: string, e: unknown) => alert(title, e instanceof ApiError ? e.message : "Có lỗi xảy ra, xin thử lại giúp ạ.");

  const placeOrder = async () => {
    if (!requireCluster()) return;
    setBusy("single");
    try {
      const order: PlacedOrder = await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify({ box_id: box.id, quantity, cluster_id: clusterId, address: address.trim() || undefined, note: note.trim() || undefined }),
      });
      setNote("");
      onPlaced(order);
    } catch (e) {
      fail("Không đặt được hộp rau", e);
    } finally {
      setBusy(null);
    }
  };

  const subscribe = async () => {
    if (!requireCluster()) return;
    setBusy("subscription");
    try {
      await apiFetch("/subscriptions", {
        method: "POST",
        body: JSON.stringify({ box_id: box.id, quantity, frequency, cluster_id: clusterId, address: address.trim() || undefined }),
      });
      alert("Đã đăng ký gói định kỳ", `${FREQUENCY_LABELS[frequency]} ${pronoun} sẽ nhận ${quantity} ${box.name}, miễn phí giao. Đổi số lượng hay tạm dừng lúc nào cũng được.`, [
        { text: "Đóng", style: "cancel" },
        { text: "Xem gói định kỳ", onPress: () => router.push("/dinh-ky") },
      ], { icon: "event_repeat" });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        alert(`${Pronoun} đã có gói cho hộp này`, `Mỗi hộp chỉ cần một gói định kỳ đang chạy. ${Pronoun} có thể đổi số lượng hoặc tần suất trong mục Gói định kỳ.`, [
          { text: "Đóng", style: "cancel" },
          { text: "Mở gói định kỳ", onPress: () => router.push("/dinh-ky") },
        ]);
      } else fail("Không đăng ký được", e);
    } finally {
      setBusy(null);
    }
  };

  const joinGroup = async (g: GroupOrder) => {
    setBusy(g.id);
    try {
      await apiFetch(`/groups/${g.id}/join`, { method: "POST", body: JSON.stringify({ quantity, address: address.trim() || undefined }) });
      router.push(`/tabs/gom-don/${g.id}`);
    } catch (e) {
      fail("Không tham gia được", e);
    } finally {
      setBusy(null);
    }
  };

  const createGroup = async () => {
    if (!requireCluster()) return;
    const title = groupTitle.trim() || `Gom ${box.name}${cluster ? ` · ${cluster.name}` : ""}`;
    setBusy("create");
    try {
      const created: GroupOrder = await apiFetch("/groups", {
        method: "POST",
        body: JSON.stringify({ box_id: box.id, cluster_id: clusterId, title, min_members: minMembers, delivery_date: groupDay ?? undefined, quantity, address: address.trim() || undefined }),
      });
      setGroupTitle("");
      router.push(`/tabs/gom-don/${created.id}`);
    } catch (e) {
      fail("Không tạo được nhóm", e);
    } finally {
      setBusy(null);
    }
  };

  const current = ORDER_MODES.find((m) => m.mode === mode) ?? ORDER_MODES[0];

  return (
    <View style={styles.panel}>
      <View style={styles.modes}>
        {ORDER_MODES.map((m) => {
          const sel = m.mode === mode;
          return (
            <PressableScale key={m.mode} haptic scaleTo={0.97} style={[styles.mode, sel && styles.modeSelected]} onPress={() => setMode(m.mode)}>
              <Icon name={m.icon} size={22} filled={sel} color={sel ? colors.onPrimary : colors.onSurfaceVariant} />
              <Text style={[styles.modeText, sel && { color: colors.onPrimary }]}>{m.label}</Text>
              {sel ? <Icon name="check" size={18} color={colors.onPrimary} /> : null}
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.hint}>{current.hint}</Text>

      <Text style={styles.label}>Số lượng</Text>
      <QuantityStepper value={quantity} onChange={setQuantity} />

      {mode === "subscription" && (
        <AnimIn>
          <Text style={styles.label}>Tần suất giao</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {FREQUENCIES.map((f) => (
              <Chip key={f} label={FREQUENCY_LABELS[f]} icon={frequency === f ? "check" : undefined} selected={frequency === f} onPress={() => setFrequency(f)} />
            ))}
          </View>
        </AnimIn>
      )}

      <Text style={styles.label}>Cụm chung cư nhận rau</Text>
      <ClusterPicker clusters={clusters} value={clusterId} onChange={setClusterId} />

      <Text style={styles.label}>Toà, tầng, số căn hộ</Text>
      <TextInput style={styles.input} placeholder="Ví dụ: Toà S2, căn 1508" placeholderTextColor={colors.onSurfaceVariant} value={address} onChangeText={setAddress} maxLength={160} />

      {mode === "single" && (
        <>
          <Text style={styles.label}>Lời nhắn cho nhà vườn (không bắt buộc)</Text>
          <TextInput style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]} placeholder="Ví dụ: nhà có bé nhỏ, cho con xin rau non" placeholderTextColor={colors.onSurfaceVariant} value={note} onChangeText={setNote} maxLength={300} multiline />
        </>
      )}

      <View style={styles.summary}>
        <Row label={`${quantity} × ${formatVND(box.price)}`} value={formatVND(subtotal)} />
        <Row
          label="Phí giao"
          value={mode === "subscription" ? "Miễn phí" : mode === "group" ? `${formatVND(fee)}, về 0₫ khi nhóm đủ người` : formatVND(fee)}
          accent={mode === "subscription"}
        />
        <View style={styles.divider} />
        <Row label={mode === "subscription" ? "Mỗi kỳ" : "Tổng cộng"} value={formatVND(total)} strong />
        {deliveryDate && mode !== "group" ? (
          <View style={styles.delivery}>
            <Icon name="event" size={16} color={colors.primary} />
            <Text style={styles.deliveryText}>
              {mode === "subscription" ? "Kỳ đầu dự kiến giao" : "Giao"} {formatDay(deliveryDate)}, 16h00 tại sảnh
            </Text>
          </View>
        ) : null}
      </View>

      {mode === "single" && <Button label={`Đặt hộp · ${formatVND(total)}`} icon="shopping_bag" onPress={placeOrder} loading={busy === "single"} style={styles.submit} />}
      {mode === "subscription" && <Button label="Đăng ký gói định kỳ" icon="event_repeat" onPress={subscribe} loading={busy === "subscription"} style={styles.submit} />}

      {mode === "group" && (
        <AnimIn>
          <Text style={styles.label}>Nhóm đang mở{cluster ? ` tại ${cluster.name}` : ""}</Text>
          {!clusterId ? (
            <Text style={styles.hint}>Chọn cụm chung cư để xem hàng xóm đang gom hộp này.</Text>
          ) : groups === null ? (
            <View style={{ alignItems: "center", padding: 16 }}>
              <Loader size={28} />
            </View>
          ) : groups.length === 0 ? (
            <Text style={styles.hint}>Toà nhà bạn chưa có nhóm nào gom hộp này. Bạn mở nhóm đầu tiên nhé.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {groups.map((g) => {
                const reached = g.current_members >= g.min_members;
                const pct = Math.min(100, Math.round((g.current_members / Math.max(1, g.min_members)) * 100));
                return (
                  <View key={g.id} style={styles.group}>
                    <PressableScale onPress={() => router.push(`/tabs/gom-don/${g.id}`)}>
                      <EmojiText style={styles.groupTitle} numberOfLines={1}>{g.title}</EmojiText>
                      <Text style={styles.groupMeta}>
                        {g.current_members}/{g.min_members} nhà · giao {formatDay(g.delivery_date)}
                      </Text>
                    </PressableScale>
                    <AnimatedProgress value={pct} wavy={!reached} color={reached ? colors.primary : colors.secondary} height={6} track={colors.surfaceContainerHighest} style={{ marginTop: 10 }} />
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
                      {reached ? <Chip icon="local_shipping" label="Đã đủ người, miễn phí giao" tone="primary" small /> : <Chip label={`Thiếu ${g.min_members - g.current_members} nhà`} small />}
                      <Button label={`Tham gia · ${quantity} hộp`} icon="group_add" small onPress={() => joinGroup(g)} loading={busy === g.id} disabled={!!busy} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.create}>
            <Text style={styles.createTitle}>Mở nhóm mới cho toà nhà</Text>
            <Text style={styles.label}>Tên nhóm</Text>
            <TextInput style={styles.input} placeholder={`Gom ${box.name}${cluster ? ` · ${cluster.name}` : ""}`} placeholderTextColor={colors.onSurfaceVariant} value={groupTitle} onChangeText={setGroupTitle} maxLength={80} />
            <Text style={styles.label}>Số nhà tối thiểu để miễn phí giao</Text>
            <QuantityStepper value={minMembers} onChange={setMinMembers} min={GROUP_MIN_MEMBERS.min} max={GROUP_MIN_MEMBERS.max} unit="nhà" />
            {deliveryDate && groupDay ? (
              <>
                <Text style={styles.label}>Ngày giao</Text>
                <DeliveryDatePicker earliest={deliveryDate} value={groupDay} onChange={setGroupDate} />
              </>
            ) : null}
            <Button label="Tạo nhóm và tham gia" icon="rocket_launch" variant="tonal" onPress={createGroup} loading={busy === "create"} disabled={!!busy && busy !== "create"} style={styles.submit} />
          </View>
        </AnimIn>
      )}
    </View>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowStrong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowStrongValue, accent && { color: colors.primary }]}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    panel: { backgroundColor: c.surfaceContainerLow, borderRadius: shape.xlIncreased, padding: 18 },
    modes: { gap: 8 },
    mode: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceContainerLowest, borderRadius: shape.lg, paddingVertical: 13, paddingHorizontal: 16, borderWidth: 1, borderColor: c.outlineVariant },
    modeSelected: { backgroundColor: c.primary, borderColor: c.primary },
    modeText: { ...type.titleMedium, color: c.onSurface, fontSize: 15, flex: 1 },
    hint: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13, marginTop: 10 },
    label: { ...type.labelLarge, color: c.onSurfaceVariant, fontSize: 12, marginTop: 16, marginBottom: 6 },
    input: { backgroundColor: c.surfaceContainer, borderRadius: shape.md, padding: 13, color: c.onSurface, fontSize: 15, borderWidth: 1, borderColor: c.outlineVariant },
    summary: { backgroundColor: c.surfaceContainerLowest, borderRadius: shape.lg, padding: 14, marginTop: 18, gap: 8 },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
    rowLabel: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 14 },
    rowValue: { ...type.labelLarge, color: c.onSurface, fontSize: 14, flexShrink: 1, textAlign: "right" },
    rowStrong: { ...type.titleMedium, color: c.onSurface, fontSize: 16 },
    rowStrongValue: { ...type.headlineSmall, color: c.primary, fontSize: 20, lineHeight: 26 },
    divider: { height: 1, backgroundColor: c.outlineVariant },
    delivery: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
    deliveryText: { ...type.labelLarge, color: c.primary, fontSize: 13, flex: 1 },
    submit: { alignSelf: "stretch", marginTop: 16 },
    group: { backgroundColor: c.surfaceContainerLowest, borderRadius: shape.lg, padding: 14, borderWidth: 1, borderColor: c.outlineVariant },
    groupTitle: { ...type.titleMedium, color: c.onSurface, fontSize: 15 },
    groupMeta: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 12 },
    create: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.outlineVariant },
    createTitle: { ...type.titleMedium, color: c.onSurface, fontSize: 16 },
  });
