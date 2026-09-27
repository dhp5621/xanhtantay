import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, Modal, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, elevation, emojiFont, useStyles, type Colors } from "../../constants/theme";
import { formatDateTime } from "../../constants/format";
import { AnimIn, AnimInScale, PressableScale } from "../../components/motion";
import { Button, PageHeader } from "../../components/ui";
import { QrImage } from "../../components/QrImage";
import { SmartImage } from "../../components/SmartImage";
import { Icon } from "../../components/Icon";
import { Loader } from "../../components/Loader";

const STATUS_LABEL: Record<string, string> = {
  harvesting: "Rau đang được nhà vườn thu hoạch",
  loaded: "Hàng đã lên xe lạnh về phố",
  delivered: "Đồ quê đã đến tận cửa nhà bạn",
};
const STEPS = ["harvesting", "loaded", "delivered"];
const STEP_ICONS = ["agriculture", "local_shipping", "home"];
const STEP_LABELS = ["Thu hoạch", "Lên xe", "Đã giao"];

interface TraceResult {
  id: string;
  status: string;
  created_at: string;
  farm: { name: string; location: string; cover_url?: string | null };
  items: { id: string; product_name?: string | null; product_unit?: string | null; quantity: number }[];
}

/** Mirrors apps/web/src/app/tra-cuu/[id] — the public package trace a QR sticker opens, plus an in-app scanner. */
export default function TraCuuScreen() {
  const styles = useStyles(makeStyles);
  const params = useLocalSearchParams<{ id?: string }>();
  const [code, setCode] = useState(params.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TraceResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const lookup = async (raw = code) => {
    // Accept a scanned/pasted trace URL as well as the bare order id.
    const id = raw.trim().split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? "";
    if (!id) return;
    setCode(id);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await apiFetch(`/orders/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tra cứu được");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) lookup(params.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const stepIdx = result ? STEPS.indexOf(result.status) : -1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <PageHeader icon="qr_code_2" eyebrow="Quét là biết" title="Tra cứu gói rau" subtitle="Quét tem QR trên gói, hoặc nhập mã đơn hàng in trên tem." />

      <AnimIn>
        <PressableScale haptic style={[styles.scanCard, elevation[1]]} onPress={() => setScanning(true)}>
          <View style={styles.scanIcon}>
            <Icon name="qr_code_2" size={30} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scanTitle}>Quét mã QR trên tem</Text>
            <Text style={styles.muted}>Mở camera, đưa tem vào khung là xong</Text>
          </View>
          <Icon name="chevron_right" size={24} color={colors.onSurfaceVariant} />
        </PressableScale>
      </AnimIn>

      <AnimIn delay={60}>
        <Text style={styles.orLabel}>hoặc nhập mã</Text>
        <View style={styles.search}>
          <Icon name="search" size={22} color={colors.onSurfaceVariant} />
          <TextInput
            style={styles.input}
            placeholder="Mã đơn hàng hoặc link tem…"
            placeholderTextColor={colors.onSurfaceVariant}
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => lookup()}
          />
          {code ? (
            <PressableScale onPress={() => setCode("")} scaleTo={0.85}>
              <Icon name="close" size={20} color={colors.onSurfaceVariant} />
            </PressableScale>
          ) : null}
        </View>
        <Button label="Tra cứu" icon="search" onPress={() => lookup()} loading={loading} disabled={loading || !code.trim()} style={{ marginTop: 10 }} />
      </AnimIn>

      {error && (
        <AnimIn>
          <View style={styles.errorBox}>
            <Icon name="error" size={20} color={colors.onErrorContainer} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </AnimIn>
      )}

      {result && (
        <AnimInScale>
          <View style={[styles.resultCard, elevation[1]]}>
            {result.farm.cover_url ? <SmartImage uri={result.farm.cover_url} style={styles.cover} /> : null}
            <Text style={styles.farmName}>{result.farm.name}</Text>
            <Text style={styles.muted}>
              <Icon name="location_on" size={12} filled color={colors.onSurfaceVariant} /> {result.farm.location}
            </Text>

            <View style={styles.statusBadge}>
              <Icon name={STEP_ICONS[Math.max(0, stepIdx)]} size={20} filled color={colors.onPrimaryContainer} />
              <Text style={styles.statusBadgeText}>{STATUS_LABEL[result.status] ?? result.status}</Text>
            </View>

            <View style={styles.stepsRow}>
              {STEPS.map((s, i) => (
                <View key={s} style={{ flex: 1, alignItems: "center" }}>
                  <View style={[styles.stepDot, i <= stepIdx && styles.stepDotDone]}>
                    <Icon name={STEP_ICONS[i]} size={18} filled color={i <= stepIdx ? colors.onPrimaryContainer : colors.onSurfaceVariant} />
                  </View>
                  <Text style={[styles.stepLabel, i <= stepIdx && { color: colors.primary, fontWeight: "700" }]}>{STEP_LABELS[i]}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.blockLabel}>TRONG GÓI NÀY</Text>
            {result.items?.map((it) => (
              <Text key={it.id} style={styles.itemLine}>
                • {it.quantity} {it.product_unit} {it.product_name}
              </Text>
            ))}
            <Text style={[styles.muted, { marginTop: 10 }]}>Đặt lúc {formatDateTime(result.created_at)} · Mã #{result.id.slice(0, 8).toUpperCase()}</Text>

            <View style={{ alignItems: "center", marginTop: 16 }}>
              <QrImage orderId={result.id} size={150} />
              <Text style={[styles.muted, { marginTop: 8 }]}>Quét mã để xem vườn, nhật ký và hành trình gói rau.</Text>
            </View>
          </View>
        </AnimInScale>
      )}

      <Scanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onScan={(value) => {
          setScanning(false);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          lookup(value);
        }}
      />
    </ScrollView>
  );
}

/** Full-screen QR scanner (expo-camera) with a viewfinder frame — closes on the first QR read. */
function Scanner({ visible, onClose, onScan }: { visible: boolean; onClose: () => void; onScan: (value: string) => void }) {
  const styles = useStyles(makeStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (visible) {
      setLocked(false);
      if (permission && !permission.granted && permission.canAskAgain) requestPermission();
    }
  }, [visible, permission, requestPermission]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.scanner}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => {
              if (locked || !data) return;
              setLocked(true);
              onScan(data);
            }}
          />
        ) : (
          <View style={styles.scannerCenter}>
            {!permission ? (
              <Loader size={40} color="#fff" />
            ) : (
              <>
                <Icon name="videocam_off" size={40} color="#fff" />
                <Text style={styles.scannerText}>Cần quyền dùng camera để quét mã QR.</Text>
                <Button label="Cho phép camera" icon="photo_camera" onPress={() => requestPermission()} />
              </>
            )}
          </View>
        )}
        <View style={styles.scannerTop} pointerEvents="box-none">
          <Text style={styles.scannerTitle}>Quét tem QR</Text>
          <PressableScale haptic style={styles.scannerClose} onPress={onClose}>
            <Icon name="close" size={22} color="#fff" />
          </PressableScale>
        </View>
        <View style={styles.viewfinder} pointerEvents="none">
          <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 }]} />
          <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 }]} />
          <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 }]} />
          <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 }]} />
        </View>
        <Text style={styles.scannerHint} pointerEvents="none">Đưa mã QR trên tem vào trong khung</Text>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    muted: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },
    scanCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.primaryContainer, borderRadius: shape.xl, padding: 16 },
    scanIcon: { width: 56, height: 56, borderRadius: shape.lg, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    scanTitle: { ...type.titleMedium, color: colors.onPrimaryContainer, fontSize: 16 },
    orLabel: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 12, textAlign: "center", marginVertical: 14, textTransform: "uppercase", letterSpacing: 0.6 },
    search: { flexDirection: "row", alignItems: "center", gap: 10, height: 52, paddingHorizontal: 16, borderRadius: shape.full, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant },
    input: { flex: 1, fontSize: 15, color: colors.onSurface },
    errorBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.errorContainer, borderRadius: shape.md, padding: 12, marginTop: 14 },
    errorText: { ...type.bodyMedium, color: colors.onErrorContainer, flex: 1 },
    resultCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 18, marginTop: 20 },
    cover: { width: "100%", height: 150, borderRadius: shape.lg, marginBottom: 12 },
    farmName: { ...emojiFont, ...type.titleLarge, color: colors.onSurface },
    statusBadge: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.primaryContainer, borderRadius: shape.md, padding: 12, marginTop: 14 },
    statusBadgeText: { ...type.labelLarge, color: colors.onPrimaryContainer, flex: 1 },
    stepsRow: { flexDirection: "row", marginTop: 14 },
    stepDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceContainerHighest, alignItems: "center", justifyContent: "center" },
    stepDotDone: { backgroundColor: colors.primaryContainer },
    stepLabel: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 4 },
    blockLabel: { ...type.labelLarge, color: colors.onSurfaceVariant, marginTop: 16, marginBottom: 4, fontSize: 11, letterSpacing: 0.6 },
    itemLine: { ...emojiFont, ...type.bodyMedium, color: colors.onSurface, marginTop: 2, fontSize: 14 },
    scanner: { flex: 1, backgroundColor: "#000" },
    scannerCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
    scannerText: { ...type.bodyMedium, color: "#fff", textAlign: "center" },
    scannerTop: { position: "absolute", top: 52, left: 20, right: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    scannerTitle: { ...type.titleLarge, color: "#fff", fontSize: 18 },
    scannerClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center" },
    viewfinder: { position: "absolute", left: "50%", top: "50%", width: 240, height: 240, marginLeft: -120, marginTop: -120 },
    corner: { position: "absolute", width: 48, height: 48, borderColor: "#A8F5BE" },
    scannerHint: { position: "absolute", bottom: 64, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,.85)", ...type.bodyMedium },
  });
