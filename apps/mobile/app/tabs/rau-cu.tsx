import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import type { Farm, Product } from "@xanhtantay/types";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, elevation } from "../../constants/theme";
import { CATEGORY_LABELS, CATEGORY_ICONS, formatVND, normalizeSearch, baseName } from "../../constants/format";
import { useCart } from "../../hooks/useCart";
import { AnimIn, PressableScale, Skeleton } from "../../components/motion";
import { Chip, EmptyState, PageHeader, Screen } from "../../components/ui";
import { CartStepper } from "../../components/CartStepper";
import { Icon } from "../../components/Icon";
import { useLiveRefresh } from "../../hooks/useLive";

interface CatalogItem {
  id: string;
  name: string;
  unit: string;
  price_per_unit: number;
  category: string;
  in_stock: boolean;
  stock_qty: number;
  image_url?: string | null;
  farm: { id: string; name: string; slug: string; location: string };
}

type Price = "" | "lt10" | "10to30" | "gt30";
type Sort = "name" | "price" | "stock";

/** Mirrors apps/web/src/components/catalog/Catalog.tsx. */
export default function RauCuScreen() {
  const cart = useCart();
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [product, setProduct] = useState("");
  const [onlyStock, setOnlyStock] = useState(true);
  const [sort, setSort] = useState<Sort>("name");
  const [showFilters, setShowFilters] = useState(false);
  const [farmId, setFarmId] = useState("");
  const [price, setPrice] = useState<Price>("");
  const [unit, setUnit] = useState("");

  const load = useCallback(async () => {
    try {
      const [products, farms]: [Product[], Farm[]] = await Promise.all([apiFetch("/products"), apiFetch("/farms")]);
      const byId = new Map(farms.map((f) => [f.id, f]));
      setItems(
        products
          .filter((p) => byId.has(p.farm_id))
          .map((p) => {
            const f = byId.get(p.farm_id)!;
            return { id: p.id, name: p.name, unit: p.unit, price_per_unit: p.price_per_unit, category: p.category, in_stock: p.in_stock && p.stock_qty > 0, stock_qty: p.stock_qty, image_url: p.image_url, farm: { id: f.id, name: f.name, slug: f.slug, location: f.location } };
          })
      );
    } catch {
      setItems((cur) => cur ?? []);
    }
  }, []);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const all = items ?? [];
  const farms = useMemo(() => Array.from(new Map(all.map((i) => [i.farm.id, i.farm])).values()).sort((a, b) => a.name.localeCompare(b.name, "vi")), [all]);
  const units = useMemo(() => Array.from(new Set(all.map((i) => i.unit))).sort(), [all]);
  const activeFilters = [farmId, price, unit, cat, product].filter(Boolean).length + (onlyStock ? 0 : 1);
  const clearFilters = () => {
    setFarmId("");
    setPrice("");
    setUnit("");
    setOnlyStock(true);
    setCat("");
    setProduct("");
  };

  // Product "aisles": distinct base names, e.g. Cà rốt, Cải xanh, Mồng tơi…
  const aisles = useMemo(() => {
    const m = new Map<string, { n: number; image?: string | null }>();
    for (const it of all) {
      const k = baseName(it.name);
      const cur = m.get(k) ?? { n: 0, image: null };
      m.set(k, { n: cur.n + 1, image: cur.image ?? it.image_url });
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], "vi")).map(([name, v]) => ({ name, n: v.n, image: v.image }));
  }, [all]);

  const filtered = useMemo(() => {
    const nq = normalizeSearch(q.trim());
    return all
      .filter(
        (it) =>
          (!cat || it.category === cat) &&
          (!product || baseName(it.name) === product) &&
          (!onlyStock || it.in_stock) &&
          (!farmId || it.farm.id === farmId) &&
          (!unit || it.unit === unit) &&
          (!price || (price === "lt10" ? it.price_per_unit < 10000 : price === "10to30" ? it.price_per_unit >= 10000 && it.price_per_unit <= 30000 : it.price_per_unit > 30000)) &&
          (!nq || normalizeSearch(it.name).includes(nq) || normalizeSearch(it.farm.name).includes(nq) || normalizeSearch(it.farm.location).includes(nq))
      )
      .sort((a, b) => (sort === "price" ? a.price_per_unit - b.price_per_unit : sort === "stock" ? b.stock_qty - a.stock_qty : a.name.localeCompare(b.name, "vi")));
  }, [all, q, cat, product, onlyStock, sort, farmId, unit, price]);

  // Group results by base product so the same vegetable from several farms sits together.
  const groups = useMemo(() => {
    const m = new Map<string, CatalogItem[]>();
    for (const it of filtered) {
      const k = baseName(it.name);
      m.set(k, [...(m.get(k) ?? []), it]);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const header = (
    <View style={{ gap: 12, marginBottom: 8 }}>
      <PageHeader icon="nutrition" eyebrow="Tất cả các vườn" title="Rau củ" subtitle="Tìm theo tên, lọc theo loại, so giá giữa các vườn" />

      <View style={styles.search}>
        <Icon name="search" size={22} color={colors.onSurfaceVariant} />
        <TextInput style={styles.searchInput} placeholder="Tìm cà rốt, cải, vườn bác Ba…" placeholderTextColor={colors.onSurfaceVariant} value={q} onChangeText={setQ} returnKeyType="search" />
        {q ? (
          <TouchableOpacity onPress={() => setQ("")} hitSlop={8}>
            <Icon name="close" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="Tất cả" selected={!cat} onPress={() => setCat("")} />
        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
          <Chip key={k} icon={CATEGORY_ICONS[k]} label={v} selected={cat === k} onPress={() => setCat(cat === k ? "" : k)} />
        ))}
        <Chip label={`⚙️ Bộ lọc${activeFilters ? ` · ${activeFilters}` : ""}`} selected={showFilters || activeFilters > 0} onPress={() => setShowFilters((v) => !v)} />
      </ScrollView>

      <View style={styles.segmented}>
        {(
          [
            ["name", "🔤 Tên"],
            ["price", "💵 Giá"],
            ["stock", "📦 Còn nhiều"],
          ] as const
        ).map(([v, l]) => (
          <TouchableOpacity key={v} style={[styles.seg, sort === v && styles.segSelected]} onPress={() => setSort(v)}>
            <Text style={[styles.segText, sort === v && { color: colors.onSecondaryContainer }]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {showFilters && (
        <AnimIn>
          <View style={styles.filterPanel}>
            <Text style={styles.filterLabel}>Vườn</Text>
            <View style={styles.wrap}>
              <Chip label="Tất cả vườn" small selected={!farmId} onPress={() => setFarmId("")} />
              {farms.map((f) => <Chip key={f.id} label={f.name} small selected={farmId === f.id} onPress={() => setFarmId(farmId === f.id ? "" : f.id)} />)}
            </View>
            <Text style={styles.filterLabel}>Khoảng giá</Text>
            <View style={styles.wrap}>
              {(
                [
                  ["", "Mọi giá"],
                  ["lt10", "Dưới 10k"],
                  ["10to30", "10k – 30k"],
                  ["gt30", "Trên 30k"],
                ] as const
              ).map(([v, l]) => <Chip key={v} label={l} small selected={price === v} onPress={() => setPrice(v)} />)}
            </View>
            <Text style={styles.filterLabel}>Đơn vị & tồn kho</Text>
            <View style={styles.wrap}>
              <Chip label="Mọi đơn vị" small selected={!unit} onPress={() => setUnit("")} />
              {units.map((u) => <Chip key={u} label={u} small selected={unit === u} onPress={() => setUnit(unit === u ? "" : u)} />)}
              <Chip label={`${onlyStock ? "✓ " : ""}Chỉ còn hàng`} small selected={onlyStock} onPress={() => setOnlyStock((v) => !v)} />
            </View>
            {activeFilters > 0 && (
              <TouchableOpacity onPress={clearFilters} style={{ alignSelf: "flex-end", padding: 6 }}>
                <Text style={{ ...type.labelLarge, color: colors.primary, fontSize: 13 }}>↺ Xoá bộ lọc</Text>
              </TouchableOpacity>
            )}
          </View>
        </AnimIn>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="▦ Mọi mặt hàng" tone="primary" selected={!product} onPress={() => setProduct("")} />
        {aisles.map((a) => (
          <PressableScale key={a.name} scaleTo={0.94} onPress={() => setProduct(product === a.name ? "" : a.name)}>
            <View style={[styles.aisle, product === a.name && { backgroundColor: colors.primary }]}>
              {a.image ? <Image source={{ uri: a.image }} style={styles.aisleThumb} contentFit="cover" transition={200} /> : <Icon name="eco" size={14} />}
              <Text style={[styles.aisleText, product === a.name && { color: colors.onPrimary }]}>
                {a.name} <Text style={{ opacity: 0.6 }}>· {a.n}</Text>
              </Text>
            </View>
          </PressableScale>
        ))}
      </ScrollView>

      <Text style={styles.count}>
        {filtered.length} sản phẩm{groups.length !== filtered.length ? ` · ${groups.length} mặt hàng` : ""}
      </Text>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={groups}
        keyExtractor={([name]) => name}
        contentContainerStyle={{ padding: 16, paddingBottom: cart.count > 0 ? 100 : 32 }}
        keyboardShouldPersistTaps="handled"
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
        ListHeaderComponent={header}
        ListEmptyComponent={
          items === null ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={92} radius={shape.lgIncreased} />
              <Skeleton height={92} radius={shape.lgIncreased} />
              <Skeleton height={92} radius={shape.lgIncreased} />
            </View>
          ) : (
            <EmptyState icon="search_off" title="Không thấy món nào" description="Thử từ khác hoặc bỏ bớt bộ lọc." />
          )
        }
        renderItem={({ item: [name, list], index }) => {
          const cheapest = Math.min(...list.map((i) => i.price_per_unit));
          return (
            <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 20 }}>
              <View style={styles.groupHead}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                  <Icon name={CATEGORY_ICONS[list[0].category] ?? "eco"} size={22} filled color={colors.primary} />
                  <Text style={styles.groupTitle}>{name}</Text>
                </View>
                <Text style={styles.groupMeta}>
                  {list.length} vườn · từ {formatVND(cheapest)}/{list[0].unit}
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                {list.map((it) => (
                  <View key={it.id} style={[styles.row, elevation[1], !it.in_stock && { opacity: 0.6 }]}>
                    <View style={styles.thumb}>
                      {it.image_url ? <Image source={{ uri: it.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} /> : <Icon name={CATEGORY_ICONS[it.category]} size={28} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.name} numberOfLines={1}>{it.name}</Text>
                      <TouchableOpacity onPress={() => router.push(`/farms/${it.farm.id}`)} hitSlop={4}>
                        <Text style={styles.farmLink}><Icon name="potted_plant" size={13} filled color={colors.primary} /> {it.farm.name}</Text>
                      </TouchableOpacity>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                        <Text style={styles.price}>
                          {formatVND(it.price_per_unit)} <Text style={styles.unit}>/ {it.unit}</Text>
                        </Text>
                        {it.price_per_unit === cheapest && list.length > 1 && <Chip label="Rẻ nhất" tone="primary" small style={{ paddingVertical: 2, paddingHorizontal: 8 }} />}
                      </View>
                      {it.in_stock ? <Text style={styles.stock}>Còn {it.stock_qty} {it.unit}</Text> : <Chip label="Hết hàng" tone="error" small style={{ marginTop: 4 }} />}
                    </View>
                    {it.in_stock && (
                      <CartStepper compact max={it.stock_qty} product={{ id: it.id, name: it.name, unit: it.unit, price_per_unit: it.price_per_unit, farm_id: it.farm.id, farm_name: it.farm.name, farm_slug: it.farm.slug, farm_location: it.farm.location }} />
                    )}
                  </View>
                ))}
              </View>
            </AnimIn>
          );
        }}
      />
      {cart.count > 0 && (
        <AnimIn style={styles.cartBarWrap}>
          <PressableScale haptic style={[styles.cartBar, elevation[3]]} onPress={() => router.push("/cart")}>
            <Text style={styles.cartBarText}><Icon name="shopping_basket" size={18} filled color={colors.onPrimary} /> {cart.count} món · {formatVND(cart.total)}</Text>
            <Text style={styles.cartBarCta}>Xem giỏ →</Text>
          </PressableScale>
        </AnimIn>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 10, height: 52, paddingHorizontal: 16, borderRadius: shape.full, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant },
  searchInput: { flex: 1, fontSize: 15, color: colors.onSurface },
  segmented: { flexDirection: "row", borderRadius: shape.full, borderWidth: 1, borderColor: colors.outlineVariant, overflow: "hidden" },
  seg: { flex: 1, paddingVertical: 9, alignItems: "center" },
  segSelected: { backgroundColor: colors.secondaryContainer },
  segText: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 12 },
  filterPanel: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 14, gap: 8 },
  filterLabel: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  aisle: { flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingHorizontal: 12, borderRadius: shape.full, backgroundColor: colors.surfaceContainerHighest },
  aisleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceContainerHigh },
  aisleText: { ...type.labelLarge, color: colors.onSurface, fontSize: 13 },
  count: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  groupHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 10 },
  groupTitle: { ...type.titleLarge, color: colors.onSurface, fontSize: 18, flex: 1 },
  groupMeta: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.lgIncreased, padding: 12 },
  thumb: { width: 76, height: 76, borderRadius: shape.lg, backgroundColor: colors.surfaceContainerHigh, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  name: { ...type.titleMedium, color: colors.onSurface, fontSize: 15 },
  farmLink: { ...type.labelLarge, color: colors.primary, fontSize: 12, marginTop: 1 },
  price: { ...type.labelLarge, color: colors.onSurface, fontSize: 15 },
  unit: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, fontWeight: "400" },
  stock: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  cartBarWrap: { position: "absolute", left: 16, right: 16, bottom: 16 },
  cartBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.primary, borderRadius: shape.full, paddingVertical: 14, paddingHorizontal: 20 },
  cartBarText: { ...type.labelLarge, color: colors.onPrimary, fontSize: 15 },
  cartBarCta: { ...type.labelLarge, color: colors.primaryContainer, fontSize: 14 },
});
