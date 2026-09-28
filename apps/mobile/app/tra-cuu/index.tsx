import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, Modal, Platform, Linking } from "react-native";
import { KeyboardScroll } from "../../components/keyboard";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, elevation, useStyles, type Colors } from "../../constants/theme";
import type { OrderTrace } from "../../constants/types";
import { useSession } from "../../hooks/useSession";
import { AnimIn, PressableScale } from "../../components/motion";
import { Button, PageHeader } from "../../components/ui";
import { TraceView } from "../../components/TraceView";
import { QrImage } from "../../components/QrImage";
import { Icon } from "../../components/Icon";
import { Loader } from "../../components/Loader";

/** The public trace the QR code on a box opens, plus an in-app scanner and manual code entry. */
export default function TraCuuScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const params = useLocalSearchParams<{ id?: string }>();
  const [code, setCode] = useState(params.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderTrace | null>(null);
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
      setResult(await apiFetch(`/orders/${encodeURIComponent(id)}`));
    } catch (e) {
      setError(e instanceof ApiError ? (e.status === 404 ? "Không tìm thấy hộp rau với mã này. Bạn kiểm tra lại mã nhé." : e.message) : "Không truy xuất được, bạn thử lại nhé.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) lookup(params.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  return (
    <KeyboardScroll style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }} keyboardShouldPersistTaps="handled">
      <PageHeader icon="qr_code_2" eyebrow="Quét là biết" title="Truy xuất hộp rau" subtitle="Quét mã QR trên hộp, hoặc nhập mã đơn để xem rau từ vườn nào, cắt lúc mấy giờ." />

      <AnimIn>
        <PressableScale haptic style={[styles.scanCard, elevation[1]]} onPress={() => setScanning(true)}>
          <View style={styles.scanIcon}>
            <Icon name="qr_code_2" size={30} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scanTitle}>Quét mã QR trên hộp</Text>
            <Text style={styles.muted}>Mở camera, đưa mã vào khung là xong</Text>
          </View>
          <Icon name="chevron_right" size={24} color={colors.onSurfaceVariant} />
        </PressableScale>
      </AnimIn>

      <AnimIn delay={60}>
        <Text style={styles.orLabel}>hoặc nhập mã đơn, dán đường link</Text>
        <View style={styles.search}>
          <Icon name="search" size={22} color={colors.onSurfaceVariant} />
          <TextInput
            style={styles.input}
            placeholder="Nhập mã đơn hàng"
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
        <Button label="Truy xuất" icon="search" onPress={() => lookup()} loading={loading} disabled={loading || !code.trim()} style={{ marginTop: 10 }} />
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
        <View style={{ marginTop: 24 }}>
          {/* Visitors cannot open farm profiles, so farms are only links for signed-in customers. */}
          <TraceView trace={result} linkFarms={!!user}>
            <AnimIn>
              <View style={styles.qrCard}>
                <QrImage orderId={result.id} size={150} />
                <Text style={[styles.muted, { marginTop: 10, textAlign: "center" }]}>Mã QR của hộp rau này. Trang truy xuất không hiện thông tin người mua.</Text>
                {result.mine ? <Button label="Mở đơn hàng của tôi" icon="package_2" variant="tonal" small onPress={() => router.push(`/don-hang/${result.id}`)} style={{ marginTop: 12 }} /> : null}
              </View>
            </AnimIn>
          </TraceView>
        </View>
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
    </KeyboardScroll>
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
                <View style={styles.scannerBadge}>
                  <Icon name="videocam_off" size={32} color="#fff" />
                </View>
                <Text style={styles.scannerText}>Cho phép camera để quét mã</Text>
                {/* Once the system stops asking, only the settings screen can grant it. */}
                <Button
                  label={permission.canAskAgain ? "Cho phép camera" : "Mở cài đặt"}
                  icon={permission.canAskAgain ? "photo_camera" : "settings"}
                  onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
                  style={styles.scannerAllow}
                />
              </>
            )}
          </View>
        )}
        <View style={styles.scannerTop} pointerEvents="box-none">
          <Text style={styles.scannerTitle}>Quét mã QR</Text>
          <PressableScale haptic style={styles.scannerClose} onPress={onClose}>
            <Icon name="close" size={22} color="#fff" />
          </PressableScale>
        </View>
        {permission?.granted ? (
          <>
            <View style={styles.viewfinder} pointerEvents="none">
              <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 }]} />
              <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 }]} />
              <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 }]} />
              <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 }]} />
            </View>
            <Text style={styles.scannerHint} numberOfLines={1} adjustsFontSizeToFit pointerEvents="none">Đưa mã QR vào trong khung</Text>
          </>
        ) : null}
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
    qrCard: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 18 },
    scanner: { flex: 1, backgroundColor: "#000" },
    scannerCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 },
    scannerBadge: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,.14)", alignItems: "center", justifyContent: "center" },
    scannerText: { ...type.titleMedium, color: "#fff", textAlign: "center" },
    scannerAllow: { alignSelf: "center", minWidth: 200 },
    scannerTop: { position: "absolute", top: 52, left: 20, right: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    scannerTitle: { ...type.titleLarge, color: "#fff", fontSize: 18 },
    scannerClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center" },
    viewfinder: { position: "absolute", left: "50%", top: "50%", width: 240, height: 240, marginLeft: -120, marginTop: -120 },
    corner: { position: "absolute", width: 48, height: 48, borderColor: "#A8F5BE" },
    scannerHint: { position: "absolute", bottom: 64, left: 24, right: 24, textAlign: "center", color: "rgba(255,255,255,.85)", ...type.bodyMedium },
  });
