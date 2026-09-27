import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams } from "expo-router";
import type { Order } from "@xanhtantay/types";
import { apiFetch, API_URL } from "../../constants/api";
import { colors, shape, type, elevation, emojiFont, useStyles } from "../../constants/theme";
import { formatDate } from "../../constants/format";
import { AnimIn, AnimInScale } from "../../components/motion";
import { Button } from "../../components/ui";
import { QrImage } from "../../components/QrImage";
import type { Colors } from "../../constants/theme";
import { useDialog } from "../../components/Dialog";
import { PageLoader } from "../../components/Loader";

type FarmerOrder = Order & { customer_name?: string | null; items?: { id: string; product_name?: string | null; product_unit?: string | null; quantity: string | number }[] };
interface Farm { id: string; name: string; location: string }

/** Mirrors apps/web/src/app/(farmer)/farmer/don-hang/[id]/tem/page.tsx — printable package label with a QR code. */
export default function TemScreen() {
  const { alert } = useDialog();
  const styles = useStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<FarmerOrder | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([apiFetch("/orders"), apiFetch("/farms/mine")])
      .then(([orders, f]: [FarmerOrder[], Farm]) => {
        const o = orders.find((x) => x.id === id);
        if (!o) throw new Error("Không tìm thấy đơn này trong vườn của bạn");
        setOrder(o);
        setFarm(f);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được tem"));
  }, [id]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{error}</Text>
      </View>
    );
  }
  if (!order || !farm) {
    return (
      <PageLoader />
    );
  }

  const code = order.id.slice(0, 8).toUpperCase();
  const harvested = formatDate(new Date(), { day: "numeric", month: "numeric" });
  const items = order.items ?? [];

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Roboto,Arial,sans-serif;color:#191C19;margin:0;padding:24px}
    .label{display:flex;gap:16px;border:1px solid #C0C9C0;border-radius:16px;padding:20px;max-width:520px}
    img{width:150px;height:150px;border-radius:8px;flex-shrink:0}
    h1{font-size:18px;margin:0 0 4px} p{margin:0 0 6px;font-size:13px} ul{margin:8px 0 0;padding-left:16px;font-size:13px} .muted{color:#404943;font-size:12px}
  </style></head><body><div class="label">
    <img src="${API_URL}/api/qr/${order.id}" alt="QR" />
    <div><h1>Xanh Tận Tay · #${code}</h1><p>${farm.name} · ${farm.location}</p>
    <p class="muted">Cho: ${order.customer_name ?? "Khách hàng"} · Hái ${harvested}</p>
    <ul>${items.map((it) => `<li>${Number(it.quantity)} ${it.product_unit ?? ""} ${it.product_name ?? ""}</li>`).join("")}</ul>
    <p class="muted" style="margin-top:8px">Quét mã để xem vườn, nhật ký và hành trình gói rau.</p></div>
  </div></body></html>`;

  const print = async () => {
    setBusy(true);
    try {
      await Print.printAsync({ html });
    } catch (e) {
      alert("Không in được", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    setBusy(true);
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS !== "web" && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Tem gói #${code}` });
      else alert("Đã tạo file tem", uri);
    } catch (e) {
      alert("Không chia sẻ được", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
      <AnimIn>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Button label="In tem" icon="print" onPress={print} loading={busy} />
          <Button label="Chia sẻ PDF" icon="share" variant="tonal" onPress={share} loading={busy} />
        </View>
      </AnimIn>

      <AnimInScale delay={60}>
        <View style={[styles.label, elevation[2]]}>
          <QrImage orderId={order.id} size={140} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.brand}>Xanh Tận Tay · #{code}</Text>
            <Text style={styles.farm}>{farm.name} · {farm.location}</Text>
            <Text style={styles.muted}>Cho: {order.customer_name ?? "Khách hàng"} · Hái {harvested}</Text>
            <View style={{ marginTop: 8, gap: 2 }}>
              {items.map((it) => (
                <Text key={it.id} style={styles.item}>
                  • {Number(it.quantity)} {it.product_unit} {it.product_name}
                </Text>
              ))}
            </View>
            <Text style={[styles.muted, { marginTop: 8, fontSize: 11 }]}>Quét mã để xem vườn, nhật ký và hành trình gói rau.</Text>
          </View>
        </View>
      </AnimInScale>

      <AnimIn delay={120}>
        <Text style={styles.body}>In tem này và dán lên gói. Khách quét là thấy vườn, món trong gói và trạng thái giao.</Text>
      </AnimIn>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  body: { ...emojiFont,  ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },
  label: { flexDirection: "row", gap: 16, backgroundColor: "#fff", borderRadius: shape.lg, padding: 18, borderWidth: 1, borderColor: colors.outlineVariant },
  brand: { fontWeight: "800", fontSize: 17, color: "#191C19" },
  farm: { fontSize: 13, color: "#191C19", marginTop: 2 },
  muted: { ...emojiFont,  fontSize: 12, color: "#404943", marginTop: 4 },
  item: { fontSize: 13, color: "#191C19" },
});
