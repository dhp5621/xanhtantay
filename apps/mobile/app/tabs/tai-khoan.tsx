import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from "react-native";
import { KeyboardScroll } from "../../components/keyboard";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import type { Cluster } from "@xanhtantay/types";
import { apiFetch, ApiError, API_URL } from "../../constants/api";
import { colors, shape, type, useStyles } from "../../constants/theme";
import { makeAvatarDataUrl } from "../../constants/media";
import { formatKg } from "../../constants/format";
import type { FarmerCapacity, FarmerCommands, FarmProfile, Gender, Me } from "../../constants/types";
import { useSession } from "../../hooks/useSession";
import { useAddress } from "../../hooks/useAddress";
import { useTheme } from "../../hooks/useTheme";
import { useLiveRefresh } from "../../hooks/useLive";
import { AnimIn, AnimInScale, PressableScale, Skeleton } from "../../components/motion";
import { Avatar, Button, Chip, ListItem, Screen, StatTile } from "../../components/ui";
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

const FARMER_MENU = [
  { href: "/tabs/farmer", icon: "agriculture", label: "Lệnh thu hoạch", desc: "Tin nhắn hôm nay và nút xác nhận" },
  { href: "/farmer/nang-suat", icon: "scale", label: "Rau củ đăng ký", desc: "Mỗi ngày cắt được bao nhiêu ký" },
  { href: "/farmer/vuon", icon: "potted_plant", label: "Thông tin vườn", desc: "Tên, địa chỉ, lời giới thiệu" },
  { href: "farm-page", icon: "storefront", label: "Trang vườn của tôi", desc: "Khách hàng thấy vườn như thế nào" },
  { href: "/tra-cuu", icon: "qr_code_2", label: "Truy xuất hộp rau", desc: "Quét mã QR trên hộp để xem hành trình" },
];

const GENDERS: { value: Gender | null; label: string }[] = [
  { value: null, label: "Không nêu" },
  { value: "female", label: "Nữ" },
  { value: "male", label: "Nam" },
];
/** The forms of address offered by hand; anything else is typed under "Khác". */
const SALUTATIONS = { farmer: ["bác", "cô", "chú"], customer: ["anh", "chị", "bạn"] };
/** What follows from gender: farmers bác / cô (bác when not given), customers anh / chị (bạn when not given). */
const byGender = (gender: Gender | null, farmer: boolean) => (gender === "female" ? (farmer ? "cô" : "chị") : gender === "male" ? (farmer ? "bác" : "anh") : farmer ? "bác" : "bạn");
const capitalise = (s: string) => s.charAt(0).toLocaleUpperCase("vi") + s.slice(1);
/** Letters only: Vietnamese letters have an upper and a lower case, digits and signs do not. */
const lettersOnly = (s: string) => Array.from(s.normalize("NFC")).filter((ch) => ch.toLowerCase() !== ch.toUpperCase()).join("");

type ProfileFormState = {
  name: string;
  phone: string;
  cluster_id: string | null;
  address: string;
  gender: Gender | null;
  /** "" follows gender. */
  salutation: string;
  short_name: string;
  /** "Khác": the person types their own form of address. */
  custom: boolean;
};

/** A request that has not answered yet is not the same as one that answered "nothing". */
type LoadState = "loading" | "ready" | "none" | "error";

/** Account: avatar, contact details, the building that receives the boxes, theme and sign-out. */
export default function TaiKhoanScreen() {
  const { alert } = useDialog();
  const styles = useStyles(makeStyles);
  const { user, loading, logout, refresh } = useSession();
  const { pronoun, apply: applyAddress, refresh: refreshAddress } = useAddress();
  const [me, setMe] = useState<Me | null>(null);
  const [farm, setFarm] = useState<FarmProfile | null>(null);
  const [meState, setMeState] = useState<LoadState>("loading");
  const [farmState, setFarmState] = useState<LoadState>("loading");
  const [commands, setCommands] = useState<FarmerCommands | null>(null);
  const [commandsState, setCommandsState] = useState<LoadState>("loading");
  // Only feeds the "Chờ duyệt" chip of "Rau củ đăng ký".
  const [capacityPending, setCapacityPending] = useState(false);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [form, setForm] = useState<ProfileFormState | null>(null);
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
    // What is already on screen stays there when a later reload fails.
    const keep = (s: LoadState): LoadState => (s === "ready" ? s : "error");
    const profile = (async () => {
      try {
        const p: Me = await apiFetch("/users/me");
        setMe(p);
        applyAddress(p);
        // Keep what the user is typing; only seed the form the first time.
        const salutation = p.salutation?.trim() ?? "";
        const offered = SALUTATIONS[user.role === "farmer" ? "farmer" : "customer"];
        setForm((f) => f ?? { name: p.name ?? "", phone: p.phone ?? "", cluster_id: p.cluster_id ?? null, address: p.address ?? "", gender: p.gender ?? null, salutation, short_name: p.short_name ?? "", custom: !!salutation && !offered.includes(salutation) });
        setMeState("ready");
      } catch {
        setMeState(keep);
      }
    })();
    if (user.role !== "farmer") {
      await Promise.all([profile, apiFetch("/clusters").then((c) => setClusters(c ?? [])).catch(() => {})]);
      return;
    }
    await Promise.all([
      profile,
      apiFetch("/farms/mine")
        .then((f: FarmProfile) => {
          setFarm(f);
          setFarmState("ready");
        })
        .catch((e) => {
          // Only a 404 means there is no farm; a failed request says nothing about it.
          if (e instanceof ApiError && e.status === 404) {
            setFarm(null);
            setFarmState("none");
          } else setFarmState(keep);
        }),
      apiFetch("/farmer/commands")
        .then((c: FarmerCommands) => {
          setCommands(c);
          setCommandsState("ready");
        })
        .catch(() => setCommandsState(keep)),
      apiFetch("/farmer/capacity")
        .then((c: FarmerCapacity) => setCapacityPending(!!c?.pending))
        .catch(() => {}),
    ]);
  }, [user, applyAddress]);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  // A different account on the same phone starts from its own details.
  useEffect(() => {
    setForm(null);
    setMe(null);
    setFarm(null);
    setCommands(null);
    setCapacityPending(false);
    setMeState("loading");
    setFarmState("loading");
    setCommandsState("loading");
  }, [user?.id]);

  const saveAvatar = async (avatar_url: string | null) => {
    setBusy(true);
    try {
      await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ avatar_url }) });
      setMe((m) => (m ? { ...m, avatar_url } : m));
      refresh().catch(() => {});
    } catch (e) {
      alert("Không lưu được", e instanceof ApiError ? e.message : "Có lỗi xảy ra, xin thử lại giúp ạ.");
    } finally {
      setBusy(false);
    }
  };

  const pickAvatar = async (source: "camera" | "library") => {
    try {
      const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error("Xin cho phép dùng máy ảnh hoặc thư viện ảnh trong phần Cài đặt ạ.");
      const res = source === "camera" ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.9, cameraType: ImagePicker.CameraType.front }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
      if (res.canceled) return;
      const a = res.assets[0];
      setBusy(true);
      await saveAvatar(await makeAvatarDataUrl(a.uri, a.width, a.height));
    } catch (e) {
      setBusy(false);
      alert("Không đọc được ảnh này", e instanceof Error ? e.message : undefined);
    }
  };

  const changeAvatar = () => {
    alert("Ảnh đại diện", "Ảnh được cắt vuông và nén còn 256×256.", [
      { text: "Huỷ", style: "cancel" as const },
      ...(me?.avatar_url ? [{ text: "Gỡ ảnh", style: "destructive" as const, onPress: () => saveAvatar(null) }] : []),
      { text: "Chọn từ máy", onPress: () => pickAvatar("library") },
      { text: "Chụp ảnh mới", onPress: () => pickAvatar("camera") },
    ], { icon: "photo_camera" });
  };

  // Gender, form of address and the name to call: only what was changed is sent.
  const addressChanges = (): { gender?: Gender | null; salutation?: string; short_name?: string } => {
    if (!form || !me) return {};
    const salutation = form.salutation.trim();
    const short_name = form.short_name.trim();
    return {
      ...(form.gender !== (me.gender ?? null) ? { gender: form.gender } : {}),
      ...(salutation !== (me.salutation?.trim() ?? "") ? { salutation } : {}),
      ...(short_name !== (me.short_name?.trim() ?? "") ? { short_name } : {}),
    };
  };
  const dirty = !!form && !!me && (form.name.trim() !== (me.name ?? "") || form.phone.trim() !== (me.phone ?? "") || Object.keys(addressChanges()).length > 0 || (!isFarmer && (form.cluster_id !== (me.cluster_id ?? null) || form.address.trim() !== (me.address ?? ""))));

  const saveProfile = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      alert("Thiếu tên", isFarmer ? "Xin điền tên để khách hàng biết ai trồng rau ạ." : "Xin điền tên để người giao hàng gọi cho đúng ạ.");
      return;
    }
    if (form.custom && !form.salutation.trim()) {
      alert("Thiếu cách xưng hô", "Xin điền cách xưng hô tự nhập, hoặc chọn một cách có sẵn ạ.");
      return;
    }
    setSaving(true);
    try {
      const called = addressChanges();
      // The answer carries the form of address the server resolved from what was just saved.
      const afterSave = (saved: Me | null) => {
        setMe((m) => (m ? { ...m, ...called, call_name: saved?.call_name ?? m.call_name, pronoun: saved?.pronoun ?? m.pronoun } : m));
        setForm((f) => (f ? { ...f, salutation: f.salutation.trim(), short_name: f.short_name.trim() } : f));
        if (saved?.pronoun) applyAddress({ id: user?.id ?? "", call_name: saved.call_name, pronoun: saved.pronoun });
        else refreshAddress().catch(() => {});
        refresh().catch(() => {});
      };
      if (isFarmer) {
        // Farmers have no delivery address: only name, phone and how they are addressed, as on the web.
        const body = { name: form.name.trim(), phone: form.phone.trim() };
        const saved: Me | null = await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ ...body, ...called }) });
        setMe((m) => (m ? { ...m, ...body, phone: body.phone || null } : m));
        setForm((f) => (f ? { ...f, ...body } : f));
        afterSave(saved);
        alert("Đã lưu thông tin", `Thông tin của ${saved?.pronoun?.trim() || pronoun} đã được cập nhật ạ.`, undefined, { icon: "check_circle" });
        return;
      }
      const body = { name: form.name.trim(), phone: form.phone.trim(), cluster_id: form.cluster_id, address: form.address.trim() };
      const saved: Me | null = await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ ...body, ...called }) });
      setMe((m) => (m ? { ...m, ...body, phone: body.phone || null, address: body.address || null, cluster: clusters.find((c) => c.id === body.cluster_id) ?? null } : m));
      setForm((f) => (f ? { ...f, ...body } : f));
      afterSave(saved);
      alert("Đã lưu thông tin", "Các đơn mới sẽ mặc định giao tới địa chỉ này.", undefined, { icon: "check_circle" });
    } catch (e) {
      alert("Không lưu được", e instanceof ApiError ? e.message : "Có lỗi xảy ra, xin thử lại giúp ạ.");
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
  const subtitle = isFarmer ? (farm ? `${farm.name} · ${farm.province}` : farmState === "none" ? "Chưa gắn với vườn nào" : farmState === "error" ? "Chưa tải được thông tin vườn" : null) : (me?.email ?? user.email ?? "");
  const retryHint = "Mạng đang yếu. Kéo xuống để thử lại.";
  const list = commands?.commands ?? [];
  const declinedCount = list.filter((c) => c.status === "declined").length;
  const stats = [
    { icon: "sms", label: "Lệnh đã nhận", value: list.length },
    { icon: "thumb_up", label: "Đã xác nhận", value: list.filter((c) => c.status === "confirmed").length },
    { icon: "pending_actions", label: "Chờ xác nhận", value: list.filter((c) => c.status === "sent").length },
  ];
  // How the person is addressed: the same fields for farmers and customers.
  const offered = SALUTATIONS[isFarmer ? "farmer" : "customer"];
  const auto = byGender(form?.gender ?? null, isFarmer);
  const given = form?.short_name.trim() || form?.name.trim().split(/\s+/).pop() || "";
  const used = form?.salutation.trim().toLowerCase() || auto;
  const addressFields = form ? (
    <>
      <Text style={styles.label}>Giới tính</Text>
      <View style={styles.segmented}>
        {GENDERS.map((g) => {
          const sel = form.gender === g.value;
          return (
            <PressableScale key={g.label} haptic scaleTo={0.96} style={[styles.seg, sel && styles.segSelected]} onPress={() => setForm((f) => (f ? { ...f, gender: g.value } : f))}>
              {sel ? <Icon name="check" size={18} color={colors.onSecondaryContainer} /> : null}
              <Text style={[styles.segText, sel && { color: colors.onSecondaryContainer }]}>{g.label}</Text>
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.label}>Cách xưng hô</Text>
      <View style={styles.chips}>
        <Chip label={`Theo giới tính (${auto})`} selected={!form.custom && !form.salutation} onPress={() => setForm((f) => (f ? { ...f, custom: false, salutation: "" } : f))} />
        {offered.map((o) => (
          <Chip key={o} label={capitalise(o)} selected={!form.custom && form.salutation === o} onPress={() => setForm((f) => (f ? { ...f, custom: false, salutation: o } : f))} />
        ))}
        <Chip label="Khác" selected={form.custom} onPress={() => setForm((f) => (f ? { ...f, custom: true, salutation: f.custom ? f.salutation : "" } : f))} />
      </View>
      {form.custom ? (
        <>
          <Text style={styles.label}>Xưng hô tự nhập</Text>
          <TextInput style={styles.input} value={form.salutation} onChangeText={(v) => setForm((f) => (f ? { ...f, salutation: lettersOnly(v).slice(0, 12) } : f))} placeholder="Ví dụ: u, dì, thầy" placeholderTextColor={colors.onSurfaceVariant} maxLength={12} autoCapitalize="none" autoCorrect={false} />
        </>
      ) : null}
      <Text style={styles.label}>Tên gọi</Text>
      <TextInput style={styles.input} value={form.short_name} onChangeText={(v) => setForm((f) => (f ? { ...f, short_name: v } : f))} placeholder={form.name.trim().split(/\s+/).pop() || "Ví dụ: Lan"} placeholderTextColor={colors.onSurfaceVariant} maxLength={24} />
      <Text style={[styles.muted, { marginTop: 12 }]}>
        Chúng tôi sẽ gọi bạn là <Text style={styles.preview}>{`${used} ${given}`.trim()}</Text> trong lời chào và thông báo.
      </Text>
    </>
  ) : null;
  const profileCard = (title: string) =>
    form ? null : (
      <View>
        <Text style={styles.sectionLabel}>{title}</Text>
        {meState === "error" ? (
          <View style={[styles.card, styles.retry]}>
            <Icon name="wifi_off" size={20} color={colors.onSurfaceVariant} />
            <Text style={[styles.muted, { flex: 1 }]}>Chưa tải được thông tin tài khoản. {retryHint}</Text>
          </View>
        ) : (
          <Skeleton height={220} radius={shape.xl} />
        )}
      </View>
    );

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <KeyboardScroll
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
                <Avatar name={name} src={me?.avatar_url ?? (user.image?.startsWith("/") ? `${API_URL}${user.image}` : user.image)} size={80} tone={isFarmer ? "tertiary" : "primary"} />
                <PressableScale haptic scaleTo={0.9} style={styles.avatarBtn} onPress={changeAvatar} disabled={busy}>
                  {busy ? <Loader size={18} color={colors.onPrimary} /> : <Icon name="photo_camera" size={15} filled color={colors.onPrimary} />}
                </PressableScale>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.heroName}>{name}</Text>
                {subtitle === null ? <Skeleton height={14} width="70%" style={{ marginVertical: 3 }} /> : <Text style={styles.heroSub} numberOfLines={1}>{subtitle}</Text>}
                <View style={styles.roleChip}>
                  <Icon name={isFarmer ? "agriculture" : "inventory_2"} size={14} filled color={colors.onSurface} />
                  <Text style={styles.roleChipText}>{isFarmer ? "Nhà vườn" : "Khách hàng"}</Text>
                </View>
              </View>
            </LinearGradient>
          </AnimInScale>

          {isFarmer ? (
            <>
              <AnimIn delay={60}>
                {commands ? (
                  <>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {stats.map((s) => (
                        <StatTile key={s.label} icon={s.icon} value={s.value} label={s.label} onPress={() => router.push("/tabs/farmer")} />
                      ))}
                    </View>
                    {declinedCount > 0 ? (
                      <View style={{ marginTop: 8 }}>
                        <Chip icon="cancel" label={`Không cắt được: ${declinedCount}`} tone="error" onPress={() => router.push("/tabs/farmer")} />
                      </View>
                    ) : null}
                  </>
                ) : commandsState === "error" ? (
                  <View style={[styles.card, styles.retry]}>
                    <Icon name="wifi_off" size={20} color={colors.onSurfaceVariant} />
                    <Text style={[styles.muted, { flex: 1 }]}>Chưa tải được số lệnh thu hoạch. {retryHint}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Skeleton height={104} radius={shape.lgIncreased} style={{ flex: 1 }} />
                    <Skeleton height={104} radius={shape.lgIncreased} style={{ flex: 1 }} />
                    <Skeleton height={104} radius={shape.lgIncreased} style={{ flex: 1 }} />
                  </View>
                )}
              </AnimIn>

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
                ) : farmState === "none" ? (
                  <View style={[styles.card, { backgroundColor: colors.errorContainer }]}>
                    <Text style={[styles.muted, { color: colors.onErrorContainer }]}>Tài khoản này chưa gắn với vườn nào. Xin liên hệ quản trị để được tạo vườn giúp ạ.</Text>
                  </View>
                ) : farmState === "error" ? (
                  <View style={[styles.card, styles.retry]}>
                    <Icon name="wifi_off" size={20} color={colors.onSurfaceVariant} />
                    <Text style={[styles.muted, { flex: 1 }]}>Chưa tải được thông tin vườn. {retryHint}</Text>
                  </View>
                ) : (
                  <View style={[styles.card, { alignItems: "center", paddingVertical: 28 }]}>
                    <Loader size={40} />
                  </View>
                )}
              </AnimIn>

              <View>
                {FARMER_MENU.filter((m) => m.href !== "farm-page" || farm).map((m, i) => (
                  <AnimIn key={m.href} index={i} delay={120}>
                    <ListItem
                      icon={m.icon}
                      title={m.label}
                      desc={m.desc}
                      trailing={
                        (m.href === "/farmer/nang-suat" && capacityPending) || (m.href === "/farmer/vuon" && farm?.pending) ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Chip label="Chờ duyệt" icon="hourglass_empty" tone="tertiary" small />
                            <Icon name="chevron_right" size={24} color={colors.onSurfaceVariant} />
                          </View>
                        ) : undefined
                      }
                      onPress={() => router.push((m.href === "farm-page" ? `/farms/${farm?.slug}` : m.href) as never)}
                    />
                  </AnimIn>
                ))}
              </View>

              <AnimIn delay={200}>
                {profileCard("THÔNG TIN CỦA TÔI") ?? (
                  <>
                    <Text style={styles.sectionLabel}>THÔNG TIN CỦA TÔI</Text>
                    <View style={styles.card}>
                      <Text style={styles.label}>Họ tên</Text>
                      <TextInput style={styles.input} value={form?.name ?? ""} onChangeText={(v) => setForm((f) => (f ? { ...f, name: v } : f))} placeholder={`Tên của ${used}`} placeholderTextColor={colors.onSurfaceVariant} maxLength={80} autoComplete="name" />
                      <Text style={styles.label}>Số điện thoại</Text>
                      <TextInput style={styles.input} value={form?.phone ?? ""} onChangeText={(v) => setForm((f) => (f ? { ...f, phone: v } : f))} placeholder="Để xe tải lạnh gọi khi tới vườn" placeholderTextColor={colors.onSurfaceVariant} keyboardType="phone-pad" maxLength={20} autoComplete="tel" />
                      {addressFields}
                      <Button label="Lưu thông tin" icon="check" onPress={saveProfile} loading={saving} disabled={!dirty} style={{ alignSelf: "stretch", marginTop: 16 }} />
                    </View>
                  </>
                )}
              </AnimIn>
            </>
          ) : (
            <>
              <AnimIn delay={80}>
                {profileCard("THÔNG TIN NHẬN RAU")}
                <View style={form ? undefined : { display: "none" }}>
                  <Text style={styles.sectionLabel}>THÔNG TIN NHẬN RAU</Text>
                  <View style={styles.card}>
                    <Text style={styles.label}>Họ tên</Text>
                    <TextInput style={styles.input} value={form?.name ?? ""} onChangeText={(v) => setForm((f) => (f ? { ...f, name: v } : f))} placeholder={`Tên của ${used}`} placeholderTextColor={colors.onSurfaceVariant} maxLength={80} autoComplete="name" />
                    <Text style={styles.label}>Số điện thoại</Text>
                    <TextInput style={styles.input} value={form?.phone ?? ""} onChangeText={(v) => setForm((f) => (f ? { ...f, phone: v } : f))} placeholder="Để người giao hàng gọi khi rau tới sảnh" placeholderTextColor={colors.onSurfaceVariant} keyboardType="phone-pad" maxLength={20} autoComplete="tel" />
                    <Text style={styles.label}>Cụm chung cư</Text>
                    <ClusterPicker clusters={clusters} value={form?.cluster_id ?? null} onChange={(id) => setForm((f) => (f ? { ...f, cluster_id: id } : f))} />
                    <Text style={styles.label}>Toà, tầng, số căn hộ</Text>
                    <TextInput style={styles.input} value={form?.address ?? ""} onChangeText={(v) => setForm((f) => (f ? { ...f, address: v } : f))} placeholder="Ví dụ: Toà S2, căn 1508" placeholderTextColor={colors.onSurfaceVariant} maxLength={160} />
                    {addressFields}
                    <Button label="Lưu thông tin" icon="check" onPress={saveProfile} loading={saving} disabled={!dirty} style={{ alignSelf: "stretch", marginTop: 16 }} />
                  </View>
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
        </KeyboardScroll>
      </View>
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
  retry: { flexDirection: "row", alignItems: "center", gap: 10 },
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  preview: { ...type.labelLarge, color: colors.onSurface, fontSize: 13 },
  segHint: { ...type.bodyMedium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 8 },
  logoutBtn: { borderWidth: 1.5, borderColor: colors.error, borderRadius: shape.full, padding: 14, alignItems: "center", alignSelf: "center", paddingHorizontal: 32 },
  logoutBtnText: { ...type.labelLarge, color: colors.error, fontSize: 15 },
});
