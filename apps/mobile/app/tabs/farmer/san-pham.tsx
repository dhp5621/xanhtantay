import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import type { Product } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../../constants/api";
import { colors, shape, type, elevation } from "../../../constants/theme";
import { CATEGORY_LABELS, CATEGORY_ICONS, formatVND } from "../../../constants/format";
import { pickMedia, uploadMedia } from "../../../constants/media";
import { AnimIn, PressableScale, Skeleton } from "../../../components/motion";
import { Button, Chip, EmptyState, PageHeader } from "../../../components/ui";
import { Icon } from "../../../components/Icon";

const UNITS = ["kg", "bó", "củ", "hộp", "trái", "gói"];
const EMPTY_FORM = { name: "", unit: "kg", price_per_unit: "10000", category: "rau_la", stock_qty: "20", image_url: null as string | null };

/** Mirrors apps/web/src/components/farmer/ProductManager.tsx (list, stock steppers, in-stock toggle, add/edit dialog with photo). */
export default function SanPhamScreen() {
  const [farm, setFarm] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const myFarm = await apiFetch("/farms/mine");
      setFarm(myFarm);
      setProducts(await apiFetch(`/products?farm_id=${myFarm.id}`));
    } catch {
      setFarm(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };
  const openEdit = (p: Product) => {
    setForm({ name: p.name, unit: p.unit, price_per_unit: String(p.price_per_unit), category: p.category, stock_qty: String(p.stock_qty), image_url: p.image_url });
    setEditing(p);
  };

  const adjustStock = async (p: Product, delta: number) => {
    const next = Math.max(0, p.stock_qty + delta);
    setProducts((xs) => xs.map((x) => (x.id === p.id ? { ...x, stock_qty: next, in_stock: next > 0 } : x)));
    try {
      await apiFetch("/products", { method: "PATCH", body: JSON.stringify({ id: p.id, stock_qty: next }) });
    } catch {
      Alert.alert("Lỗi", "Không lưu được tồn kho");
      load();
    }
  };

  const toggleStock = async (p: Product) => {
    setProducts((xs) => xs.map((x) => (x.id === p.id ? { ...x, in_stock: !p.in_stock } : x)));
    try {
      await apiFetch("/products", { method: "PATCH", body: JSON.stringify({ id: p.id, in_stock: !p.in_stock }) });
    } catch (e) {
      setProducts((xs) => xs.map((x) => (x.id === p.id ? { ...x, in_stock: p.in_stock } : x)));
      Alert.alert("Lỗi", e instanceof ApiError ? e.message : "Không cập nhật được");
    }
  };

  const pickPhoto = async (source: "camera" | "library") => {
    setUploading(true);
    try {
      const [m] = await pickMedia({ source, allowVideo: false, max: 1 });
      if (m) {
        const url = await uploadMedia(m);
        setForm((f) => ({ ...f, image_url: url }));
      }
    } catch (e) {
      Alert.alert("Không tải được ảnh", e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim() || !farm) return;
    setBusy(true);
    try {
      const isNew = editing === "new";
      const payload = { name: form.name.trim(), unit: form.unit, price_per_unit: Number(form.price_per_unit) || 0, category: form.category, stock_qty: Number(form.stock_qty) || 0 };
      let data: Product = await apiFetch("/products", {
        method: isNew ? "POST" : "PATCH",
        body: JSON.stringify(isNew ? { farm_id: farm.id, ...payload } : { id: (editing as Product).id, ...payload, image_url: form.image_url }),
      });
      // POST doesn't take image_url, so a new product's photo is attached with a follow-up PATCH.
      if (isNew && form.image_url) data = await apiFetch("/products", { method: "PATCH", body: JSON.stringify({ id: data.id, image_url: form.image_url }) });
      setProducts((xs) => (isNew ? [...xs, data] : xs.map((x) => (x.id === data.id ? data : x))));
      setEditing(null);
    } catch (e) {
      Alert.alert("Không lưu được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  if (farm === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, padding: 16, gap: 10 }}>
        <Skeleton height={110} radius={shape.lg} />
        <Skeleton height={110} radius={shape.lg} />
        <Skeleton height={110} radius={shape.lg} />
      </View>
    );
  }
  if (farm === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Bạn chưa có vườn. Liên hệ quản trị để tạo vườn trước khi thêm sản phẩm.</Text>
      </View>
    );
  }

  const inStock = products.filter((p) => p.in_stock && p.stock_qty > 0).length;

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListHeaderComponent={<PageHeader icon="nutrition" eyebrow={`${inStock}/${products.length} món còn hàng`} title="Sản phẩm" subtitle="Có gì bán nấy, hái theo đơn đã chốt. Về 0 là tự ẩn hết hàng." />}
        ListEmptyComponent={<EmptyState icon="grass" title="Chưa có sản phẩm nào" description="Thêm món đầu tiên nhé." action={<Button label="Thêm sản phẩm" icon="add" onPress={openNew} />} />}
        renderItem={({ item: p, index }) => {
          const selling = p.in_stock && p.stock_qty > 0;
          return (
            <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 12 }}>
              <View style={[styles.card, elevation[1], !selling && { opacity: 0.6 }]}>
                <View style={styles.cardTop}>
                  <PressableScale onPress={() => openEdit(p)} style={styles.thumb}>
                    {p.image_url ? <Image source={{ uri: p.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} /> : <Icon name={CATEGORY_ICONS[p.category]} size={26} />}
                  </PressableScale>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.productPrice}>{formatVND(p.price_per_unit)} / {p.unit}</Text>
                    <Text style={styles.body}>{CATEGORY_LABELS[p.category] ?? p.category}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openEdit(p)} hitSlop={8}>
                    <Text style={styles.editLink}><Icon name="edit" size={14} color={colors.primary} /> Sửa</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.cardBottom}>
                  <View style={styles.stockStepper}>
                    <TouchableOpacity style={styles.stockBtn} onPress={() => adjustStock(p, -1)}>
                      <Text style={styles.stockBtnText}>–</Text>
                    </TouchableOpacity>
                    <Text style={styles.stockQty}>{p.stock_qty} {p.unit}</Text>
                    <TouchableOpacity style={[styles.stockBtn, { backgroundColor: colors.primary, borderRadius: shape.full }]} onPress={() => adjustStock(p, 1)}>
                      <Text style={[styles.stockBtnText, { color: colors.onPrimary }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Chip label={selling ? "✅ Đang bán" : "⛔ Hết hàng"} tone={selling ? "primary" : "error"} small onPress={() => toggleStock(p)} />
                </View>
              </View>
            </AnimIn>
          );
        }}
      />

      {products.length > 0 && (
        <AnimIn style={styles.fabWrap}>
          <PressableScale haptic style={[styles.fab, elevation[3]]} onPress={openNew}>
            <Text style={styles.fabText}>＋ Thêm sản phẩm</Text>
          </PressableScale>
        </AnimIn>
      )}

      <Modal visible={editing !== null} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
              <Text style={styles.modalTitle}>{editing === "new" ? "Thêm sản phẩm" : "Sửa sản phẩm"}</Text>

              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View style={styles.photoBox}>
                  {uploading ? <ActivityIndicator color={colors.primary} /> : form.image_url ? <Image source={{ uri: form.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : <Icon name={CATEGORY_ICONS[form.category]} size={30} />}
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.body}>Ảnh sản phẩm (tuỳ chọn)</Text>
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                    <Chip icon="photo_camera" label="Chụp" small onPress={() => pickPhoto("camera")} />
                    <Chip icon="image" label="Chọn ảnh" small onPress={() => pickPhoto("library")} />
                    {form.image_url && <Chip icon="delete" label="Gỡ" tone="error" small onPress={() => setForm({ ...form, image_url: null })} />}
                  </View>
                </View>
              </View>

              <TextInput style={styles.input} placeholder="Tên sản phẩm" placeholderTextColor={colors.onSurfaceVariant} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} maxLength={80} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Còn lại" placeholderTextColor={colors.onSurfaceVariant} keyboardType="numeric" value={form.stock_qty} onChangeText={(v) => setForm({ ...form, stock_qty: v })} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Giá (₫)" placeholderTextColor={colors.onSurfaceVariant} keyboardType="numeric" value={form.price_per_unit} onChangeText={(v) => setForm({ ...form, price_per_unit: v })} />
              </View>
              <Text style={styles.body}>Đơn vị</Text>
              <View style={styles.wrap}>
                {UNITS.map((u) => <Chip key={u} label={u} small selected={form.unit === u} onPress={() => setForm({ ...form, unit: u })} />)}
              </View>
              <Text style={styles.body}>Loại</Text>
              <View style={styles.wrap}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <Chip key={k} icon={CATEGORY_ICONS[k]} label={v} small selected={form.category === k} onPress={() => setForm({ ...form, category: k })} />)}
              </View>
              <View style={styles.modalActions}>
                <Button label="Huỷ" variant="text" onPress={() => setEditing(null)} />
                <Button label="Lưu" icon="check" onPress={save} loading={busy} disabled={uploading || !form.name.trim()} />
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
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  body: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lgIncreased, padding: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: shape.md, backgroundColor: colors.surfaceContainerHigh, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  productName: { ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
  productPrice: { ...type.labelLarge, color: colors.primary, fontSize: 14, marginTop: 1 },
  editLink: { ...type.labelLarge, color: colors.primary, fontSize: 13 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  stockStepper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.full, padding: 2 },
  stockBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  stockBtnText: { fontWeight: "700", color: colors.onSurface, fontSize: 18, lineHeight: 20 },
  stockQty: { minWidth: 72, textAlign: "center", fontWeight: "700", color: colors.onSurface, fontSize: 13 },
  fabWrap: { position: "absolute", right: 16, bottom: 20 },
  fab: { backgroundColor: colors.primary, borderRadius: shape.full, paddingVertical: 14, paddingHorizontal: 20 },
  fabText: { ...type.labelLarge, color: colors.onPrimary, fontSize: 15 },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: shape.xlIncreased, borderTopRightRadius: shape.xlIncreased, padding: 20, paddingBottom: 32, maxHeight: "90%" },
  modalTitle: { ...type.titleLarge, color: colors.onSurface, marginBottom: 6 },
  photoBox: { width: 88, height: 88, borderRadius: shape.lg, backgroundColor: colors.surfaceContainerHigh, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  input: { backgroundColor: colors.surfaceContainer, borderRadius: shape.md, padding: 13, color: colors.onSurface, fontSize: 15, borderWidth: 1, borderColor: colors.outlineVariant },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
});
