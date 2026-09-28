import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { colors, shape, type, elevation, useStyles, type Colors } from "../constants/theme";
import { ORDER_TYPE_ICONS, ORDER_TYPE_LABELS, SIZE_LABELS } from "../constants/commerce";
import { formatDateTime, formatDay, formatKg } from "../constants/format";
import type { MenuTarget, OrderTrace } from "../constants/types";
import { AnimIn, AnimInScale, PressableScale } from "./motion";
import { Chip, SectionHead } from "./ui";
import { SmartImage } from "./SmartImage";
import { Icon } from "./Icon";
import { OrderTimeline, StatusBanner } from "./OrderTimeline";
import { BoxContents } from "./BoxContents";
import { BoxMenu } from "./BoxMenu";

/**
 * The journey of one box, shared by the order detail and the public QR trace: which farms cut it and
 * when, how it travelled, what is inside and the menu that comes with it. Never shows who bought it.
 */
export function TraceView({ trace, linkFarms = true, lead, menuTarget, children }: { trace: OrderTrace; linkFarms?: boolean; lead?: ReactNode; /** set on the buyer's own order; the public trace keeps the menu read-only */ menuTarget?: MenuTarget; children?: ReactNode }) {
  const styles = useStyles(makeStyles);
  const farmer = trace.farms?.find((f) => f.farmer)?.farmer ?? null;
  const box = trace.box;

  return (
    <View style={{ gap: 24 }}>
      <AnimInScale>
        <View style={[styles.header, elevation[1]]}>
          <SmartImage uri={box?.image_url} style={styles.photo} loaderSize={24} />
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Text style={styles.boxName} numberOfLines={2}>{box?.name ?? "Hộp rau"}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {box ? <Chip label={SIZE_LABELS[box.size] ?? box.size} tone="primary" small /> : null}
              <Chip icon={ORDER_TYPE_ICONS[trace.type]} label={ORDER_TYPE_LABELS[trace.type] ?? trace.type} small />
              <Chip label={`${trace.quantity} hộp${box ? ` · ${formatKg(Number(box.weight_kg) * trace.quantity)}` : ""}`} small />
            </View>
            <Text style={styles.muted}>Mã #{trace.id.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>
      </AnimInScale>

      {lead}

      <AnimIn delay={60}>
        <SectionHead icon="favorite" title="Hành trình hộp rau" />
        <View style={styles.card}>
          <StatusBanner status={trace.status} farmer={farmer} />
          <View style={{ marginTop: 16 }}>
            <OrderTimeline status={trace.status} farmer={farmer} stamps={{ harvesting: trace.harvested_at, loaded: trace.loaded_at, delivered: trace.delivered_at }} />
          </View>
          <View style={styles.facts}>
            <Fact icon="event" label="Ngày giao" value={formatDay(trace.delivery_date)} />
            {trace.cluster ? <Fact icon="apartment" label="Điểm nhận" value={`Sảnh ${trace.cluster.name}, ${trace.cluster.district}`} /> : null}
            <Fact icon="agriculture" label="Thu hoạch" value={trace.harvested_at ? formatDateTime(trace.harvested_at) : trace.status === "cancelled" ? "Đơn đã huỷ trước khi thu hoạch" : "4h00 sáng ngày giao, sau khi chốt sổ"} />
            <Fact icon="schedule" label="Đặt lúc" value={formatDateTime(trace.created_at)} />
          </View>
        </View>
      </AnimIn>

      {trace.farms?.length ? (
        <AnimIn delay={100}>
          <SectionHead icon="potted_plant" title="Vườn trồng hộp rau này" />
          <View style={{ gap: 8 }}>
            {trace.farms.map((f) => {
              const row = (
                <>
                  <View style={styles.farmIcon}>
                    <Icon name="agriculture" size={22} color={colors.onPrimaryContainer} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.farmName} numberOfLines={1}>{f.name}</Text>
                    <Text style={styles.muted} numberOfLines={1}>
                      {f.farmer ? `${f.farmer} · ` : ""}
                      {f.location}
                    </Text>
                  </View>
                  {trace.allocated && f.confirmed !== undefined ? <Chip icon={f.confirmed ? "check_circle" : "schedule"} label={f.confirmed ? "Đã nhận lệnh" : "Chờ xác nhận"} tone={f.confirmed ? "primary" : "surface"} small /> : null}
                  {linkFarms ? <Icon name="chevron_right" size={22} color={colors.onSurfaceVariant} /> : null}
                </>
              );
              return linkFarms ? (
                <PressableScale key={f.slug} style={styles.farmRow} onPress={() => router.push(`/farms/${f.slug}`)}>
                  {row}
                </PressableScale>
              ) : (
                <View key={f.slug} style={styles.farmRow}>
                  {row}
                </View>
              );
            })}
          </View>
        </AnimIn>
      ) : null}

      <AnimIn delay={140}>
        <SectionHead icon="inventory_2" title="Trong hộp có gì" />
        <BoxContents items={trace.contents ?? []} linkFarms={linkFarms} />
      </AnimIn>

      {box?.meal_plan?.length ? (
        <AnimIn delay={180}>
          <SectionHead icon="menu_book" title={`Thực đơn ${box.days} ngày kèm hộp`} />
          <BoxMenu key={trace.id} mealPlan={box.meal_plan} target={menuTarget} customised={box.customised} />
        </AnimIn>
      ) : null}

      {children}
    </View>
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

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    muted: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 12 },
    header: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.surfaceContainerLowest, borderRadius: shape.xl, padding: 14 },
    photo: { width: 92, height: 92, borderRadius: shape.lg },
    boxName: { ...type.titleLarge, color: c.onSurface, fontSize: 19, lineHeight: 25 },
    card: { backgroundColor: c.surfaceContainerLow, borderRadius: shape.xl, padding: 16 },
    facts: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.outlineVariant, gap: 10 },
    fact: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    factLabel: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13, width: 84 },
    factValue: { ...type.labelLarge, color: c.onSurface, fontSize: 13, flex: 1 },
    farmRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceContainerLowest, borderRadius: shape.lg, padding: 12, borderWidth: 1, borderColor: c.outlineVariant },
    farmIcon: { width: 44, height: 44, borderRadius: shape.md, backgroundColor: c.primaryContainer, alignItems: "center", justifyContent: "center" },
    farmName: { ...type.titleMedium, color: c.onSurface, fontSize: 15 },
  });
