import { useEffect, useState } from "react";
import { View, Text, TextInput, Modal, Pressable, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, ApiError } from "../constants/api";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { makePhotoDataUrl } from "../constants/media";
import type { ProduceCategory, ProduceProposal, ProduceProposals } from "../constants/types";
import { KeyboardPad, KeyboardScroll } from "./keyboard";
import { QuantityStepper } from "./QuantityStepper";
import { Button, Chip } from "./ui";
import { Loader } from "./Loader";
import { Icon } from "./Icon";

const NAME_MAX = 40;
const NOTE_MAX = 300;
const CATEGORIES: { value: ProduceCategory; label: string; icon: string }[] = [
  { value: "rau_la", label: "Rau lá", icon: "eco" },
  { value: "cu_qua", label: "Củ quả", icon: "nutrition" },
];
const EMPTY = { name: "", category: "rau_la" as ProduceCategory, daily_kg: 10, image_url: null as string | null, note: "" };

/** The form a farmer fills in to ask for a produce that is not on the list yet, with a photo. */
export function ProduceProposalSheet({ visible, onClose, onSent }: { visible: boolean; onClose: () => void; onSent: (proposals: ProduceProposal[]) => void }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [sending, setSending] = useState(false);

  // Every opening starts from an empty form.
  useEffect(() => {
    if (!visible) return;
    setForm(EMPTY);
    setError(null);
  }, [visible]);

  const pick = async (source: "camera" | "library") => {
    setError(null);
    try {
      const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError(source === "camera" ? "Xin cho phép dùng máy ảnh trong phần Cài đặt để chụp ảnh ạ." : "Xin cho phép xem thư viện ảnh trong phần Cài đặt để chọn ảnh ạ.");
        return;
      }
      const res = source === "camera" ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
      if (res.canceled) return;
      const a = res.assets[0];
      setReading(true);
      const image_url = await makePhotoDataUrl(a.uri, a.width, a.height);
      setForm((f) => ({ ...f, image_url }));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Không đọc được ảnh này, xin chọn ảnh khác giúp ạ.");
    } finally {
      setReading(false);
    }
  };

  const submit = async () => {
    const name = form.name.replace(/\s+/g, " ").trim();
    if (name.length < 2) {
      setError("Xin điền tên rau củ, ít nhất 2 chữ ạ.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res: ProduceProposals = await apiFetch("/farmer/produce", {
        method: "POST",
        body: JSON.stringify({ name, category: form.category, daily_kg: form.daily_kg, ...(form.image_url ? { image_url: form.image_url } : {}), ...(form.note.trim() ? { note: form.note.trim() } : {}) }),
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSent(res?.proposals ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Mạng đang yếu, xin bấm gửi lại giúp ạ.");
    } finally {
      setSending(false);
    }
  };

  const busy = reading || sending;
  const close = () => {
    if (!sending) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      <KeyboardPad style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
          <KeyboardScroll pad={false} containerStyle={{ flex: 0, flexShrink: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={styles.sheetIcon}>
                <Icon name="grass" size={26} color={colors.onPrimaryContainer} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Đăng ký rau củ mới</Text>
                <Text style={styles.subtitle}>Quản trị duyệt xong là có trong danh sách.</Text>
              </View>
            </View>

            <Text style={styles.label}>Tên rau củ</Text>
            <TextInput style={styles.input} placeholder="Ví dụ: Rau bò khai" placeholderTextColor={colors.onSurfaceVariant} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} maxLength={NAME_MAX} editable={!sending} />

            <Text style={styles.label}>Loại</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {CATEGORIES.map((c) => (
                <Chip key={c.value} label={c.label} icon={form.category === c.value ? "check" : c.icon} selected={form.category === c.value} onPress={() => setForm((f) => ({ ...f, category: c.value }))} style={styles.chip} />
              ))}
            </View>

            <Text style={styles.label}>Mỗi ngày cắt được</Text>
            <QuantityStepper value={form.daily_kg} onChange={(n) => setForm((f) => ({ ...f, daily_kg: n }))} min={1} max={500} step={5} unit="kg/ngày" large />

            <Text style={styles.label}>Ảnh</Text>
            {form.image_url ? (
              <View style={styles.photoRow}>
                <Image source={{ uri: form.image_url }} style={styles.photo} contentFit="cover" transition={200} />
                <Button label="Bỏ ảnh" icon="delete" variant="error" onPress={() => setForm((f) => ({ ...f, image_url: null }))} disabled={busy} />
              </View>
            ) : reading ? (
              <View style={styles.reading}>
                <Loader size={28} />
                <Text style={styles.subtitle}>Đang thu nhỏ ảnh…</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: form.image_url || reading ? 12 : 0 }}>
              <Button label={form.image_url ? "Chụp lại" : "Chụp ảnh"} icon="photo_camera" variant="tonal" onPress={() => pick("camera")} disabled={busy} />
              <Button label="Chọn từ máy" icon="photo_library" variant="tonal" onPress={() => pick("library")} disabled={busy} />
            </View>

            <Text style={styles.label}>Ghi chú (không bắt buộc)</Text>
            <TextInput
              style={[styles.input, styles.note]}
              placeholder="Ví dụ: có từ tháng 3 đến tháng 6"
              placeholderTextColor={colors.onSurfaceVariant}
              value={form.note}
              onChangeText={(v) => setForm((f) => ({ ...f, note: v }))}
              maxLength={NOTE_MAX}
              multiline
              editable={!sending}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Icon name="error" size={22} color={colors.onErrorContainer} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button label="Gửi yêu cầu duyệt" icon="send" onPress={submit} loading={sending} disabled={reading} style={styles.submit} />
            <Button label="Để sau" variant="text" onPress={close} disabled={sending} style={{ alignSelf: "center", marginTop: 4 }} />
          </KeyboardScroll>
        </View>
      </KeyboardPad>
    </Modal>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    scrim: { flex: 1, backgroundColor: c.scrim, justifyContent: "flex-end" },
    sheet: { backgroundColor: c.surfaceContainerLowest, borderTopLeftRadius: shape.xlIncreased, borderTopRightRadius: shape.xlIncreased, padding: 22, maxHeight: "92%" },
    sheetIcon: { width: 52, height: 52, borderRadius: shape.md, backgroundColor: c.primaryContainer, alignItems: "center", justifyContent: "center" },
    sheetTitle: { ...type.headlineSmall, color: c.onSurface, fontSize: 22, lineHeight: 29 },
    subtitle: { ...type.bodyLarge, color: c.onSurfaceVariant, fontSize: 16, lineHeight: 23 },
    label: { ...type.labelLarge, color: c.onSurfaceVariant, fontSize: 16, lineHeight: 22, marginTop: 18, marginBottom: 8 },
    input: { backgroundColor: c.surfaceContainer, borderRadius: shape.md, padding: 14, color: c.onSurface, fontSize: 19, borderWidth: 1, borderColor: c.outlineVariant },
    note: { minHeight: 92, textAlignVertical: "top" },
    chip: { paddingVertical: 12, paddingHorizontal: 18 },
    photoRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    photo: { width: 120, height: 120, borderRadius: shape.lg, backgroundColor: c.surfaceContainerHighest },
    reading: { flexDirection: "row", alignItems: "center", gap: 12 },
    errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: c.errorContainer, borderRadius: shape.lg, padding: 14, marginTop: 18 },
    errorText: { ...type.bodyLarge, color: c.onErrorContainer, fontSize: 17, lineHeight: 25, flex: 1 },
    submit: { alignSelf: "stretch", paddingVertical: 18, marginTop: 20 },
  });
