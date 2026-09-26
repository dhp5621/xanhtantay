import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Modal, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import type { Product } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../../constants/api";
import { colors, shape, type, elevation } from "../../../constants/theme";
import { formatVnd } from "../../../constants/commerce";

const UNITS = ["kg", "bó", "củ", "hộp", "trái", "gói"];
const EMPTY_FORM = { name: "", unit: "kg", price_per_unit: "10000", category: "rau_la", stock_qty: "20" };

export default function SanPhamScreen() {
  const [farm, setFarm] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

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
      load().finally(() => setLoading(false));
    }, [load])
  );

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };
  const openEdit = (p: Product) => {
    setForm({ name: p.name, unit: p.unit, price_per_unit: String(p.price_per_unit), category: p.category, stock_qty: String(p.stock_qty) });
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

  const save = async () => {
    if (!form.name.trim() || !farm) return;
    setBusy(true);
    try {
      const isNew = editing === "new";
      const payload = {
        name: form.name.trim(),
        unit: form.unit,
        price_per_unit: Number(form.price_per_unit) || 0,
        category: form.category,
        stock_qty: Number(form.stock_qty) || 0,
      };
      const data = await apiFetch("/products", {
        method: isNew ? "POST" : "PATCH",
        body: JSON.stringify(isNew ? { farm_id: farm.id, ...payload } : { id: (editing as Product).id, ...payload }),
      });
      setProducts((xs) => (isNew ? [...xs, data] : xs.map((x) => (x.id === data.id ? data : x))));
      setEditing(null);
    } catch (e) {
      Alert.alert("Không lưu được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!farm) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Bạn chưa có vườn. Liên hệ quản trị để tạo vườn trước khi thêm sản phẩm.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Sản phẩm 🥬</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 32 }}
        ListEmptyComponent={<Text style={styles.body}>Chưa có sản phẩm nào. Thêm món đầu tiên nhé.</Text>}
        renderItem={({ item: p }) => (
          <View style={[styles.card, elevation[1], !(p.in_stock && p.stock_qty > 0) && { opacity: 0.6 }]}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.productPrice}>{formatVnd(p.price_per_unit)} / {p.unit}</Text>
              </View>
              <TouchableOpacity onPress={() => openEdit(p)}>
                <Text style={styles.editLink}>Sửa</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardBottom}>
              <View style={styles.stockStepper}>
                <TouchableOpacity style={styles.stockBtn} onPress={() => adjustStock(p, -1)}>
                  <Text style={styles.stockBtnText}>–</Text>
                </TouchableOpacity>
                <Text style={styles.stockQty}>{p.stock_qty} {p.unit}</Text>
                <TouchableOpacity style={styles.stockBtn} onPress={() => adjustStock(p, 1)}>
                  <Text style={styles.stockBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: p.in_stock && p.stock_qty > 0 ? colors.primaryContainer : colors.errorContainer }]}
                onPress={() => toggleStock(p)}
              >
                <Text style={{ color: p.in_stock && p.stock_qty > 0 ? colors.onPrimaryContainer : colors.onErrorContainer, fontWeight: "700", fontSize: 12 }}>
                  {p.in_stock && p.stock_qty > 0 ? "Đang bán" : "Hết hàng"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={editing !== null} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing === "new" ? "Thêm sản phẩm" : "Sửa sản phẩm"}</Text>
            <TextInput style={styles.input} placeholder="Tên sản phẩm" placeholderTextColor={colors.onSurfaceVariant} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Còn lại" placeholderTextColor={colors.onSurfaceVariant} keyboardType="numeric" value={form.stock_qty} onChangeText={(v) => setForm({ ...form, stock_qty: v })} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Giá (₫)" placeholderTextColor={colors.onSurfaceVariant} keyboardType="numeric" value={form.price_per_unit} onChangeText={(v) => setForm({ ...form, price_per_unit: v })} />
            </View>
            <View style={styles.unitRow}>
              {UNITS.map((u) => (
                <TouchableOpacity key={u} style={[styles.unitChip, form.unit === u && styles.unitChipSelected]} onPress={() => setForm({ ...form, unit: u })}>
                  <Text style={[styles.unitChipText, form.unit === u && { color: colors.onPrimary }]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                <Text style={styles.cancelBtnText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} disabled={busy} onPress={save}>
                {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.saveBtnText}>Lưu</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  body: { ...type.bodyMedium, color: colors.onSurfaceVariant, textAlign: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  title: { ...type.headlineSmall, color: colors.onSurface },
  addBtn: { backgroundColor: colors.primary, borderRadius: shape.full, paddingVertical: 8, paddingHorizontal: 16 },
  addBtnText: { color: colors.onPrimary, fontWeight: "700" },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lg, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  productName: { ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
  productPrice: { ...type.bodyMedium, color: colors.primary, fontWeight: "700", marginTop: 2 },
  editLink: { color: colors.primary, fontWeight: "700" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  stockStepper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.full },
  stockBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  stockBtnText: { fontWeight: "700", color: colors.onSurface },
  stockQty: { minWidth: 70, textAlign: "center", fontWeight: "700", color: colors.onSurface, fontSize: 12 },
  toggleBtn: { borderRadius: shape.full, paddingVertical: 6, paddingHorizontal: 12 },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: shape.xl, borderTopRightRadius: shape.xl, padding: 20, gap: 10 },
  modalTitle: { ...type.titleLarge, color: colors.onSurface, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceContainerHighest, borderRadius: shape.md, padding: 12, color: colors.onSurface },
  unitRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  unitChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: shape.full, backgroundColor: colors.surfaceContainerHighest },
  unitChipSelected: { backgroundColor: colors.primary },
  unitChipText: { color: colors.onSurface, fontWeight: "600" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  cancelBtn: { padding: 12 },
  cancelBtnText: { color: colors.onSurfaceVariant, fontWeight: "700" },
  saveBtn: { backgroundColor: colors.primary, borderRadius: shape.full, paddingVertical: 12, paddingHorizontal: 24 },
  saveBtnText: { color: colors.onPrimary, fontWeight: "700" },
});
