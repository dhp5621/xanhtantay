import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import type { Cluster } from "@xanhtantay/types";
import { apiFetch, ApiError } from "../../constants/api";
import { colors, shape, type, useStyles } from "../../constants/theme";
import { makeAvatarDataUrl } from "../../constants/media";
import { formatKg } from "../../constants/format";
import type { FarmProfile, Me } from "../../constants/types";
import { useSession } from "../../hooks/useSession";
import { useTheme } from "../../hooks/useTheme";
import { useLiveRefresh } from "../../hooks/useLive";
import { AnimIn, AnimInScale, PressableScale, Skeleton } from "../../components/motion";
import { Avatar, Button, Chip, ListItem, Screen } from "../../components/ui";
import { ClusterPicker } from "../../components/ClusterPicker";
import { Icon } from "../../components/Icon";
import type { Colors } from "../../constants/theme";
import { useDialog } from "../../components/Dialog";
import { Loader } from "../../components/Loader";

const CUSTOMER_MENU = [
  { href: "/tabs/don-hang", icon: "package_2", label: "Đơn hàng", desc: "Theo dõi hộp rau theo từng giờ" },
  { href: "/dinh-ky", icon: "event_repeat", label: "Gói định kỳ", desc: "Tự lên đơn mỗi kỳ, miễn phí giao" },
  { href: "/tabs/gom-don", icon: "groups", label: "Gom đơn", desc: "Đặt chung với hàng xóm cùng toà" },
  { href: "/tra-cuu", icon: "qr_code_2", label: "Quét mã QR", desc: "Xem vườn trồng và giờ thu hoạch của một hộp rau" },
  { href: "/farms", icon: "potted_plant", label: "Vườn rau", desc: "Những nhà vườn trồng rau cho bạn" },
];

/** Account: avatar, contact details, the building that receives the boxes, theme and sign-out. */
export default function TaiKhoanScreen() {
  const { alert } = useDialog();
  const styles = useStyles(makeStyles);
  const { user, loading, logout, refresh } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [farm, setFarm] = useState<FarmProfile | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [form, setForm] = useState<{ name: string; phone: string; cluster_id: string | null; address: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isFarmer = user?.role === "farmer";

  const load = useCallback(async () => {
    if (!user) {
      setMe(null);
      setFarm(null);
      setForm(null);
      return;
    }
    try {
      const profile: Me = await apiFetch("/users/me");
      setMe(profile);
      // Keep what the user is typing; only seed the form the first time.
      setForm((f) => f ?? { name: profile.name ?? "", phone: profile.phone ?? "", cluster_id: profile.cluster_id ?? null, address: profile.address ?? "" });
    } catch {
      // stale session → the account page just shows the login CTA
    }
    if (user.role === "farmer") setFarm(await apiFetch("/farms/mine").catch(() => null));
    else setClusters((await apiFetch("/clusters").catch(() => null)) ?? []);
  }, [user]);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  // A different account on the same phone starts from its own details.
  useEffect(() => {
    setForm(null);
  }, [user?.id]);

  const saveAvatar = async (avatar_url: string | null) => {
    setBusy(true);
    try {
      await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ avatar_url }) });
      setMe((m) => (m ? { ...m, avatar_url } : m));
      refresh().catch(() => {});
    } catch (e) {
      alert("Không lưu được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
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
      alert("Không đọc được ảnh này", e instanceof Error ? e.message : undefined);
    }
  };

  const changeAvatar = () => {
    alert("Ảnh đại diện", "Ảnh được cắt vuông và nén còn 96×96, chỉ vài KB.", [
      { text: "Huỷ", style: "cancel" as const },
      ...(me?.avatar_url ? [{ text: "Gỡ ảnh", style: "destructive" as const, onPress: () => saveAvatar(null) }] : []),
      { text: "Chọn từ máy", onPress: () => pickAvatar("library") },
      { text: "Chụp ảnh mới", onPress: () => pickAvatar("camera") },
    ], { icon: "photo_camera" });
  };

  const dirty = !!form && !!me && (form.name.trim() !== (me.name ?? "") || form.phone.trim() !== (me.phone ?? "") || form.cluster_id !== (me.cluster_id ?? null) || form.address.trim() !== (me.address ?? ""));

  const saveProfile = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      alert("Thiếu tên", "Bạn điền tên để bác giao hàng gọi cho đúng nhé.");
      return;
    }
    setSaving(true);
    try {
      const body = { name: form.name.trim(), phone: form.phone.trim(), cluster_id: form.cluster_id, address: form.address.trim() };
      await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify(body) });
      setMe((m) => (m ? { ...m, ...body, phone: body.phone || null, address: body.address || null, cluster: clusters.find((c) => c.id === body.cluster_id) ?? null } : m));
      setForm({ ...body });
      refresh().catch(() => {});
      alert("Đã lưu thông tin", "Các đơn mới sẽ mặc định giao tới địa chỉ này.", undefined, { icon: "check_circle" });
    } catch (e) {
      alert("Không lưu được", e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen style={{ padding: 20, gap: 12 }}>
        <Skeleton height={140} radius={shape.xlIncreased} />
        <Skeleton height={220} radius={shape.xl} />
        <Skeleton height={72} radius={shape.lg} />
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
                <Text style={styles.heroSub}>Đăng nhập để đặt hộp rau, theo dõi đơn hàng và gom đơn cùng toà nhà.</Text>
              </View>
            </View>
          </AnimInScale>
          <AnimIn delay={80}>
            <Button label="Đăng nhập" icon="login" onPress={() => router.push("/dang-nhap")} />
          </AnimIn>
          <AnimIn delay={140}>
            <ListItem icon="qr_code_2" title="Quét mã QR" desc="Quét mã trên hộp rau để xem vườn trồng và hành trình" onPress={() => router.push("/tra-cuu")} />
          </AnimIn>
          <AnimIn delay={200}>
            <ThemePicker />
          </AnimIn>
        </ScrollView>
      </Screen>
    );
  }

  const name = me?.name ?? user.name ?? "";
  const subtitle = isFarmer ? (farm ? `${farm.name} · ${farm.province}` : "Chưa gắn với vườn nào") : (me?.email ?? user.email ?? "");

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
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
                  {busy ? <Loader size={18} color={colors.onPrimary} /> : <Icon name="photo_camera" size={15} filled color={colors.onPrimary} />}
                </PressableScale>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.heroName}>{name}</Text>
                <Text style={styles.heroSub} numberOfLines={1}>{subtitle}</Text>
                <View style={styles.roleChip}>
                  <Icon name={isFarmer ? "agriculture" : "inventory_2"} size={14} filled color={colors.onSurface} />
                  <Text style={styles.roleChipText}>{isFarmer ? "Nhà vườn" : "Khách hàng"}</Text>
                </View>
              </View>
            </LinearGradient>
          </AnimInScale>

          {isFarmer ? (
            <AnimIn delay={80}>
              <Text style={styles.sectionLabel}>VƯỜN CỦA TÔI</Text>
              {farm ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{farm.name}</Text>
                  <View style={styles.infoRow}>
                    <Icon name="location_on" size={18} color={colors.onSurfaceVariant} />
                    <Text style={styles.infoText}>
                      {farm.location}
                      {farm.province && !farm.location?.includes(farm.province) ? `, ${farm.province}` : ""}
                    </Text>
                  </View>
                  {farm.description ? <Text style={[styles.muted, { marginTop: 8 }]}>{farm.description}</Text> : null}
                  {farm.grows?.length ? (
                    <>
                      <Text style={[styles.sectionLabel, { marginTop: 14 }]}>SỨC TRỒNG ĐÃ ĐĂNG KÝ MỖI NGÀY</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {farm.grows.map((g) => (
                          <Chip key={g.produce_id} icon="eco" label={`${g.name} · ${formatKg(g.daily_kg)}`} tone="primary" small />
                        ))}
                      </View>
                    </>
                  ) : null}
                </View>
              ) : (
                <View style={[styles.card, { backgroundColor: colors.errorContainer }]}>
                  <Text style={[styles.muted, { color: colors.onErrorContainer }]}>Tài khoản này chưa gắn với vườn nào. Bác liên hệ quản trị để được tạo vườn nhé.</Text>
                </View>
              )}
            </AnimIn>
          ) : (
            <>
              <AnimIn delay={80}>
                <Text style={styles.sectionLabel}>THÔNG TIN NHẬN RAU</Text>
                <View style={styles.card}>
                  <Text style={styles.label}>Họ tên</Text>
                  <TextInput style={styles.input} value={form?.name ?? ""} onChangeText={(v) => setForm((f) => (f ? { ...f, name: v } : f))} placeholder="Tên của bạn" placeholderTextColor={colors.onSurfaceVariant} maxLength={80} autoComplete="name" />
                  <Text style={styles.label}>Số điện thoại</Text>
                  <TextInput style={styles.input} value={form?.phone ?? ""} onChangeText={(v) => setForm((f) => (f ? { ...f, phone: v } : f))} placeholder="Để bác giao hàng gọi khi rau tới sảnh" placeholderTextColor={colors.onSurfaceVariant} keyboardType="phone-pad" maxLength={20} autoComplete="tel" />
                  <Text style={styles.label}>Cụm chung cư</Text>
                  <ClusterPicker clusters={clusters} value={form?.cluster_id ?? null} onChange={(id) => setForm((f) => (f ? { ...f, cluster_id: id } : f))} />
                  <Text style={styles.label}>Toà, tầng, số căn hộ</Text>
                  <TextInput style={styles.input} value={form?.address ?? ""} onChangeText={(v) => setForm((f) => (f ? { ...f, address: v } : f))} placeholder="Ví dụ: Toà S2, căn 1508" placeholderTextColor={colors.onSurfaceVariant} maxLength={160} />
                  <Button label="Lưu thông tin" icon="check" onPress={saveProfile} loading={saving} disabled={!dirty} style={{ alignSelf: "stretch", marginTop: 16 }} />
                </View>
              </AnimIn>

              <View>
                {CUSTOMER_MENU.map((m, i) => (
                  <AnimIn key={m.href} index={i} delay={160}>
                    <ListItem icon={m.icon} title={m.label} desc={m.desc} onPress={() => router.push(m.href as never)} />
                  </AnimIn>
                ))}
              </View>
            </>
          )}

          <AnimIn delay={280}>
            <ThemePicker />
          </AnimIn>

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
              {signingOut ? <Loader size={22} color={colors.error} /> : <Text style={styles.logoutBtnText}>Đăng xuất</Text>}
            </TouchableOpacity>
          </AnimIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Light / dark / device chooser (M3 segmented buttons) — available signed in or out. */
function ThemePicker() {
  const styles = useStyles(makeStyles);
  const { preference, setPreference } = useTheme();
  return (
    <View>
      <Text style={styles.sectionLabel}>GIAO DIỆN</Text>
      <View style={styles.segmented}>
        {(
          [
            ["system", "brightness_auto", "Theo thiết bị"],
            ["light", "light_mode", "Sáng"],
            ["dark", "dark_mode", "Tối"],
          ] as const
        ).map(([v, ic, l]) => {
          const sel = preference === v;
          return (
            <PressableScale key={v} haptic scaleTo={0.96} style={[styles.seg, sel && styles.segSelected]} onPress={() => setPreference(v)}>
              <Icon name={sel ? "check" : ic} size={18} color={sel ? colors.onSecondaryContainer : colors.onSurfaceVariant} />
              <Text style={[styles.segText, sel && { color: colors.onSecondaryContainer }]}>{l}</Text>
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.segHint}>{preference === "system" ? "Đổi theo chế độ sáng/tối của điện thoại." : preference === "dark" ? "Luôn dùng giao diện tối." : "Luôn dùng giao diện sáng."}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 18, borderRadius: shape.xlIncreased, padding: 24 },
  heroName: { ...type.headlineSmall, color: colors.onPrimaryContainer, fontSize: 22 },
  heroSub: { ...type.bodyMedium, color: colors.onPrimaryContainer, opacity: 0.8, fontSize: 13 },
  roleChip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", marginTop: 8, backgroundColor: colors.surfaceContainerLowest, borderRadius: shape.full, paddingVertical: 4, paddingHorizontal: 10 },
  roleChipText: { ...type.labelLarge, color: colors.onSurface, fontSize: 12, lineHeight: 16 },
  muted: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 13 },
  card: { backgroundColor: colors.surfaceContainerLow, borderRadius: shape.xl, padding: 18 },
  cardTitle: { ...type.titleLarge, color: colors.onSurface, fontSize: 19, lineHeight: 25 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 6 },
  infoText: { ...type.bodyMedium, color: colors.onSurface, fontSize: 14, flex: 1 },
  label: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceContainer, borderRadius: shape.md, padding: 13, color: colors.onSurface, fontSize: 15, borderWidth: 1, borderColor: colors.outlineVariant },
  avatarBtn: { position: "absolute", right: -4, bottom: -4, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.surfaceContainerLowest, alignItems: "center", justifyContent: "center" },
  sectionLabel: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 11, letterSpacing: 0.6, marginBottom: 8 },
  segmented: { flexDirection: "row", borderRadius: shape.full, borderWidth: 1, borderColor: colors.outlineVariant, overflow: "hidden" },
  seg: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11 },
  segSelected: { backgroundColor: colors.secondaryContainer },
  segText: { ...type.labelLarge, color: colors.onSurfaceVariant, fontSize: 12 },
  segHint: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 8 },
  logoutBtn: { borderWidth: 1.5, borderColor: colors.error, borderRadius: shape.full, padding: 14, alignItems: "center", alignSelf: "center", paddingHorizontal: 32 },
  logoutBtnText: { ...type.labelLarge, color: colors.error, fontSize: 15 },
});
