import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type } from "../../constants/theme";
import { pickMedia, makeAvatarDataUrl } from "../../constants/media";
import * as ImagePicker from "expo-image-picker";
import { useSession } from "../../hooks/useSession";
import { AnimIn, AnimInScale, PressableScale, Skeleton } from "../../components/motion";
import { Avatar, Button, ListItem, Screen, StatTile } from "../../components/ui";
import { Icon } from "../../components/Icon";

interface Me {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "customer" | "farmer";
  avatar_url: string | null;
  stats: Record<string, number>;
  farm: { id: string; name: string; slug: string; location: string } | null;
}

/** Mirrors apps/web/src/app/(customer)/tai-khoan/page.tsx + AvatarUploader. */
export default function TaiKhoanScreen() {
  const { user, loading, logout, refresh } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setMe(null);
      return;
    }
    try {
      setMe(await apiFetch("/users/me"));
    } catch {
      // stale session → the account page just shows the login CTA
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const saveAvatar = async (avatar_url: string | null) => {
    setBusy(true);
    try {
      await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ avatar_url }) });
      setMe((m) => (m ? { ...m, avatar_url } : m));
      refresh().catch(() => {});
    } catch (e) {
      Alert.alert("Không lưu được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  const pickAvatar = async (source: "camera" | "library") => {
    try {
      const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error("Cần cấp quyền để chọn ảnh");
      const res = source === "camera" ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.9, cameraType: ImagePicker.CameraType.front }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
      if (res.canceled) return;
      const a = res.assets[0];
      setBusy(true);
      await saveAvatar(await makeAvatarDataUrl(a.uri, a.width, a.height, 96));
    } catch (e) {
      setBusy(false);
      Alert.alert("Không đọc được ảnh này", e instanceof Error ? e.message : undefined);
    }
  };

  const changeAvatar = () => {
    Alert.alert("Ảnh đại diện", "Ảnh được cắt vuông và nén còn 96×96, chỉ vài KB.", [
      { text: "📷 Chụp ảnh mới", onPress: () => pickAvatar("camera") },
      { text: "🖼️ Chọn từ máy", onPress: () => pickAvatar("library") },
      ...(me?.avatar_url ? [{ text: "🗑️ Gỡ ảnh", style: "destructive" as const, onPress: () => saveAvatar(null) }] : []),
      { text: "Huỷ", style: "cancel" as const },
    ]);
  };

  if (loading) {
    return (
      <Screen style={{ padding: 20, gap: 12 }}>
        <Skeleton height={140} radius={shape.xlIncreased} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Skeleton height={96} radius={shape.lgIncreased} width="32%" />
          <Skeleton height={96} radius={shape.lgIncreased} width="32%" />
          <Skeleton height={96} radius={shape.lgIncreased} width="32%" />
        </View>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <AnimInScale>
            <View style={[styles.hero, { backgroundColor: colors.primaryContainer }]}>
              <Avatar name="?" size={72} />
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>Chào bạn</Text>
                <Text style={styles.heroSub}>Đăng nhập để xem đơn hàng, gói định kỳ và tích điểm trồng cây.</Text>
              </View>
            </View>
          </AnimInScale>
          <AnimIn delay={80}>
            <Button label="Đăng nhập" icon="login" onPress={() => router.push("/dang-nhap")} />
          </AnimIn>
          <AnimIn delay={140}>
            <ListItem icon="search" title="Tra cứu gói rau" desc="Nhập mã trên tem QR để xem hành trình" onPress={() => router.push("/tra-cuu")} />
            <ListItem icon="potted_plant" title="Xem các vườn đang bán" desc="Không cần đăng nhập" onPress={() => router.push("/tabs/farms")} />
          </AnimIn>
        </ScrollView>
      </Screen>
    );
  }

  const isFarmer = user.role === "farmer";
  const name = me?.name ?? user.name ?? "";
  const subtitle = isFarmer ? (me?.farm ? `${me.farm.name} · ${me.farm.location}` : "Chưa gắn với vườn nào") : (me?.email ?? user.email ?? "");

  const stats = isFarmer
    ? [
        { icon: "pending_actions", label: "Đơn chờ hái", value: me?.stats.pendingOrders ?? 0, href: "/tabs/farmer/don-hang" },
        { icon: "nutrition", label: "Sản phẩm", value: me?.stats.products ?? 0, href: "/tabs/farmer/san-pham" },
        { icon: "event_repeat", label: "Khách đăng ký", value: me?.stats.subscribers ?? 0, href: "/tabs/farmer/dang-ky" },
      ]
    : [
        { icon: "package_2", label: "Đơn hàng", value: me?.stats.orders ?? 0, href: "/tabs/don-hang" },
        { icon: "event_repeat", label: "Gói đang chạy", value: me?.stats.activeSubscriptions ?? 0, href: "/dinh-ky" },
        { icon: "groups", label: "Nhóm gom đơn", value: me?.stats.groups ?? 0, href: "/tabs/gom-don" },
      ];

  const menu = isFarmer
    ? [
        { href: "/tabs/farmer", icon: "dashboard", label: "Tổng quan vườn", desc: "Số liệu và đơn gần đây" },
        { href: "/tabs/farmer/don-hang", icon: "package_2", label: "Đơn hàng", desc: "Thu hoạch, lên xe, đã giao" },
        { href: "/tabs/farmer/san-pham", icon: "inventory_2", label: "Sản phẩm & tồn kho", desc: "Bật tắt món còn hàng, đổi giá" },
        { href: "/tabs/farmer/nhat-ky", icon: "photo_camera", label: "Đăng nhật ký vườn", desc: "Ảnh, video từ vườn hôm nay" },
        { href: "/tabs/farmer/dang-ky", icon: "event_repeat", label: "Khách đăng ký", desc: "Gói giao định kỳ từ vườn bạn" },
        ...(me?.farm ? [{ href: `/farms/${me.farm.id}`, icon: "storefront", label: "Xem trang vườn của tôi", desc: "Như khách hàng nhìn thấy" }] : []),
      ]
    : [
        { href: "/vuon-cua-toi", icon: "park", label: "Vườn của tôi", desc: "Điểm, hạng và cây bạn đã trồng" },
        { href: "/tabs/don-hang", icon: "package_2", label: "Đơn hàng của tôi", desc: "Theo dõi hành trình rau" },
        { href: "/dinh-ky", icon: "event_repeat", label: "Gói đăng ký", desc: "Giao định kỳ tuần / tháng" },
        { href: "/tabs/gom-don", icon: "groups", label: "Gom đơn chung", desc: "Mua chung, chia ship" },
        { href: "/tra-cuu", icon: "search", label: "Tra cứu gói rau", desc: "Xem hành trình một gói rau" },
      ];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([load(), refresh()]);
              setRefreshing(false);
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <AnimInScale>
          <LinearGradient colors={isFarmer ? [colors.tertiaryContainer, colors.primaryContainer] : [colors.primaryContainer, colors.tertiaryContainer]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={{ position: "relative" }}>
              <Avatar name={name} src={me?.avatar_url ?? user.image} size={80} tone={isFarmer ? "tertiary" : "primary"} />
              <PressableScale haptic scaleTo={0.9} style={styles.avatarBtn} onPress={changeAvatar} disabled={busy}>
                {busy ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Icon name="photo_camera" size={15} filled color={colors.onPrimary} />}
              </PressableScale>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.heroName}>{name}</Text>
              <Text style={styles.heroSub} numberOfLines={1}>{subtitle}</Text>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText}><Icon name={isFarmer ? "agriculture" : "shopping_basket"} size={14} filled color={colors.onSurface} /> {isFarmer ? "Nhà vườn" : "Khách hàng"}</Text>
              </View>
            </View>
          </LinearGradient>
        </AnimInScale>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {stats.map((s, i) => (
            <AnimIn key={s.label} index={i} delay={80} style={{ flex: 1 }}>
              <StatTile icon={s.icon} value={s.value} label={s.label} onPress={() => router.push(s.href as never)} />
            </AnimIn>
          ))}
        </View>

        <View>
          {menu.map((m, i) => (
            <AnimIn key={m.href} index={i} delay={160}>
              <ListItem icon={m.icon} title={m.label} desc={m.desc} onPress={() => router.push(m.href as never)} />
            </AnimIn>
          ))}
        </View>

        <AnimIn delay={320}>
          <TouchableOpacity
            style={styles.logoutBtn}
            disabled={signingOut}
            onPress={async () => {
              setSigningOut(true);
              await logout();
              setSigningOut(false);
            }}
          >
            {signingOut ? <ActivityIndicator color={colors.error} /> : <Text style={styles.logoutBtnText}>Đăng xuất</Text>}
          </TouchableOpacity>
        </AnimIn>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 18, borderRadius: shape.xlIncreased, padding: 24 },
  heroName: { ...type.headlineSmall, color: colors.onPrimaryContainer, fontSize: 22 },
  heroSub: { ...type.bodyMedium, color: colors.onPrimaryContainer, opacity: 0.8, fontSize: 13 },
  roleChip: { alignSelf: "flex-start", marginTop: 8, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.full, paddingVertical: 4, paddingHorizontal: 10 },
  roleChipText: { ...type.labelLarge, color: colors.onSurface, fontSize: 12 },
  avatarBtn: { position: "absolute", right: -4, bottom: -4, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.surfaceContainerLowest, alignItems: "center", justifyContent: "center" },
  logoutBtn: { borderWidth: 1.5, borderColor: colors.error, borderRadius: shape.full, padding: 14, alignItems: "center", alignSelf: "center", paddingHorizontal: 32 },
  logoutBtnText: { ...type.labelLarge, color: colors.error, fontSize: 15 },
});
