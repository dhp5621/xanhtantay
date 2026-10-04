"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CutoffBanner } from "@/components/ui/CutoffBanner";
import { formatVND } from "@/lib/format";
import { CARE_MESSAGE_MAX, DELIVERY_DAYS_LABEL, FREQUENCY_LABELS, PAYMENT_METHOD_LABELS, RECIPIENT_NAME_MAX, deliveryDates, formatKg, formatYMD, shipFeeFor } from "@/lib/commerce";

interface Cluster { id: string; name: string; address: string; district: string }
interface Group { id: string; title: string; cluster_id: string; min_members: number; current_members: number; delivery_date: string }
interface Placed { id: string; total: number; care_message: string | null; delivery_date: string; payment_method?: string; recipient_name?: string | null; impact: { toFarmers: number; weightKg: number; meals: number; servings: number } }
type Mode = "single" | "subscription" | "group";

const MODES: { value: Mode; label: string; icon: string; hint: string }[] = [
  { value: "subscription", label: "Gói định kỳ", icon: "event_repeat", hint: "Tự về mỗi kỳ, tạm dừng hay dời ngày được" },
  { value: "group", label: "Gom đơn", icon: "groups", hint: "Cùng điểm nhận, đủ nhóm miễn phí giao" },
  { value: "single", label: "Mua một lần", icon: "shopping_bag", hint: `Giao ${DELIVERY_DAYS_LABEL} gần nhất` },
];

/** Three ways to get a box: subscription, group buying at the same pickup point, or a one-off order. Any of them can be a gift for a relative. */
export function OrderPanel({ box, clusters, groups, me, deliveryDate, cutoffAt }: {
  box: { id: string; slug: string; name: string; size: string; price: number; weight_kg: number; days: number };
  clusters: Cluster[]; groups: Group[];
  me: { cluster_id: string | null; address: string | null } | null;
  deliveryDate: string; cutoffAt: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const { show } = useSnackbar();
  const [mode, setMode] = useState<Mode>("subscription");
  const [qty, setQty] = useState(1);
  const [clusterId, setClusterId] = useState(me?.cluster_id ?? clusters[0]?.id ?? "");
  const [address, setAddress] = useState(me?.address ?? "");
  const [note, setNote] = useState("");
  const [careMessage, setCareMessage] = useState("");
  // "Đặt cho người thân": a parent orders, the child receives. Such orders are always prepaid.
  const [gift, setGift] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [payment, setPayment] = useState<"transfer" | "cod">("transfer");
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [groupId, setGroupId] = useState<string>("new");
  const [groupTitle, setGroupTitle] = useState("");
  // A new group may be delivered later than the earliest open day; the hour never changes.
  const [groupDate, setGroupDate] = useState(deliveryDate);
  const [minMembers, setMinMembers] = useState(3);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);

  const isFarmer = (session?.user as { role?: string } | undefined)?.role === "farmer";
  const nearby = useMemo(() => groups.filter((g) => g.cluster_id === clusterId), [groups, clusterId]);
  const group = nearby.find((g) => g.id === groupId) ?? null;
  const subtotal = box.price * qty;
  // Per box, by size. Only a group that fills by the cut-off gets it back to 0.
  const ship = shipFeeFor(box.size, qty);
  const clusterName = clusters.find((c) => c.id === clusterId)?.name ?? "";
  const care_message = careMessage.trim() || undefined;
  // Subscriptions and gifts are prepaid by transfer; otherwise the customer chooses.
  const prepaid = gift || mode === "subscription";
  const payment_method = prepaid ? "transfer" : payment;
  const recipient = gift ? { recipient_name: recipientName.trim(), recipient_phone: recipientPhone.trim() } : {};
  const groupDates = deliveryDates(deliveryDate, 14);

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Không thực hiện được");
    return data;
  };

  const submit = async () => {
    if (!session) { router.push(`/dang-nhap?role=customer&next=/hop-rau/${box.slug}`); return; }
    if (!clusterId) { show("Chọn điểm nhận hàng", { kind: "error" }); return; }
    if (gift && (recipientName.trim().length < 2 || !recipientPhone.trim())) { show("Nhập tên và số điện thoại người nhận", { kind: "error" }); return; }
    setBusy(true);
    try {
      if (mode === "single") {
        setPlaced(await post("/api/orders", { box_id: box.id, quantity: qty, cluster_id: clusterId, address, note: note.trim() || undefined, care_message, payment_method, ...recipient }));
      } else if (mode === "subscription") {
        await post("/api/subscriptions", { box_id: box.id, quantity: qty, frequency, cluster_id: clusterId, address, care_message, ...recipient });
        show("Đã tạo gói định kỳ. Hộp đầu tiên sẽ vào sổ ở lần chốt tới.", { kind: "success" });
        router.push("/dinh-ky");
      } else if (group) {
        await post(`/api/groups/${group.id}/join`, { quantity: qty, address, care_message, payment_method, ...recipient });
        show("Bạn đã vào nhóm. Rủ thêm bạn cùng khu để cả nhóm miễn phí giao!", { kind: "success" });
        router.push(`/gom-don/${group.id}`);
      } else {
        const g = await post("/api/groups", { box_id: box.id, cluster_id: clusterId, title: groupTitle.trim() || `Gom hộp rau ${clusterName}`, min_members: minMembers, delivery_date: groupDate, quantity: qty, address, care_message, payment_method, ...recipient });
        show("Đã tạo nhóm. Chia sẻ link cho bạn cùng khu nhé!", { kind: "success" });
        router.push(`/gom-don/${g.id}`);
      }
      router.refresh();
    } catch (e) {
      show(e instanceof Error ? e.message : "Có lỗi xảy ra", { kind: "error", duration: 6000 });
    } finally { setBusy(false); }
  };

  if (isFarmer) return <div className="m3-card-filled" style={{ padding: 20, borderRadius: "var(--shape-xl)" }}><p className="body-md text-on-surface-variant">Tài khoản nhà vườn chỉ xem hộp rau, không đặt mua.</p></div>;

  return (
    <aside className="m3-card-elevated m3-order-panel" style={{ borderRadius: "var(--shape-xl-inc)", padding: 20, overflow: "visible" }}>
      <CutoffBanner cutoffAt={cutoffAt} deliveryLabel={formatYMD(deliveryDate)} compact />

      <p className="m3-label" style={{ margin: "16px 0 8px" }}>Cách nhận hộp rau</p>
      <div className="flex flex-col gap-2">
        {MODES.map((m) => (
          <button key={m.value} type="button" onClick={() => setMode(m.value)} aria-pressed={mode === m.value} className="m3-list-item" style={{ border: "none", cursor: "pointer", textAlign: "left", width: "100%", background: mode === m.value ? "var(--md-primary-container)" : "var(--md-surface-container)", color: mode === m.value ? "var(--md-on-primary-container)" : "var(--md-on-surface)", padding: "12px 14px" }}>
            <span className="m3-list-leading" style={{ width: 40, height: 40, background: mode === m.value ? "var(--md-primary)" : "var(--md-surface-container-highest)", color: mode === m.value ? "var(--md-on-primary)" : "var(--md-on-surface-variant)" }}><Icon name={m.icon} filled={mode === m.value} /></span>
            <span style={{ flex: 1 }}><span className="title-sm" style={{ display: "block" }}>{m.label}</span><span className="body-sm" style={{ opacity: 0.8, fontWeight: 400 }}>{m.hint}</span></span>
            <Icon name={mode === m.value ? "radio_button_checked" : "radio_button_unchecked"} />
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3" style={{ marginTop: 16 }}>
        {mode === "subscription" && (
          <div className="m3-field">
            <label className="m3-field-label">Tần suất</label>
            <div className="m3-button-group" style={{ display: "flex" }}>
              {(["weekly", "biweekly", "monthly"] as const).map((f) => <button key={f} type="button" className={`m3-seg ${frequency === f ? "selected" : ""}`} onClick={() => setFrequency(f)} style={{ fontSize: 13, padding: "0 8px" }}>{FREQUENCY_LABELS[f]}</button>)}
            </div>
          </div>
        )}

        <div className="m3-field">
          <label className="m3-field-label" htmlFor="op-cluster">Điểm nhận (ký túc xá / khu trọ)</label>
          <select id="op-cluster" className="m3-select" value={clusterId} onChange={(e) => { setClusterId(e.target.value); setGroupId("new"); }}>
            {clusters.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.district}</option>)}
          </select>
        </div>
        <div className="m3-field">
          <label className="m3-field-label" htmlFor="op-addr">{gift ? "Nhà · phòng của người nhận" : "Nhà · phòng"}</label>
          <input id="op-addr" className="m3-input" placeholder="Ví dụ: Nhà B6 · phòng 412" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={120} />
        </div>

        <div className="m3-field">
          <button type="button" className={`m3-chip ${gift ? "selected" : ""}`} aria-pressed={gift} onClick={() => setGift((g) => !g)} style={{ height: 40, alignSelf: "flex-start" }}>
            <Icon name={gift ? "check" : "redeem"} size={18} /> Đặt cho người thân
          </button>
          {gift && (
            <div className="flex flex-col gap-2" style={{ marginTop: 8 }}>
              <input className="m3-input" placeholder="Tên người nhận (ví dụ: con gái Nguyễn Thị Lan)" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} maxLength={RECIPIENT_NAME_MAX} aria-label="Tên người nhận" />
              <input className="m3-input" type="tel" inputMode="tel" placeholder="Số điện thoại người nhận" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} maxLength={15} aria-label="Số điện thoại người nhận" />
              <p className="body-sm text-on-surface-variant">Bố mẹ ở quê đặt, con ở Hà Nội nhận. Điểm nhận và phòng ở trên là của người nhận; khi rau tới, người giao gọi số này.</p>
            </div>
          )}
        </div>

        {mode === "group" && (
          <div className="m3-field">
            <label className="m3-field-label">Nhóm ở điểm nhận này</label>
            <div className="flex flex-col gap-2">
              {nearby.map((g) => (
                <button key={g.id} type="button" onClick={() => setGroupId(g.id)} className={`m3-chip ${groupId === g.id ? "selected" : ""}`} style={{ height: "auto", padding: "8px 12px", justifyContent: "space-between", whiteSpace: "normal", textAlign: "left" }}>
                  <span><strong>{g.title}</strong><br /><span style={{ opacity: 0.8 }}>{g.current_members}/{g.min_members} người · giao {formatYMD(g.delivery_date, { day: "numeric", month: "numeric" })}</span></span>
                  {groupId === g.id && <Icon name="check" size={18} />}
                </button>
              ))}
              <button type="button" onClick={() => setGroupId("new")} className={`m3-chip ${groupId === "new" ? "selected" : ""}`} style={{ height: 40 }}><Icon name="add" size={18} /> Tạo nhóm mới cho {clusterName || "điểm nhận"}</button>
            </div>
            {groupId === "new" && (
              <div className="m3-field" style={{ marginTop: 6 }}>
                <label className="m3-field-label" htmlFor="op-date">Ngày giao ({DELIVERY_DAYS_LABEL}, 16h00 tại điểm nhận)</label>
                <select id="op-date" className="m3-select" value={groupDate} onChange={(e) => setGroupDate(e.target.value)}>
                  {groupDates.map((d) => <option key={d} value={d}>{formatYMD(d)}</option>)}
                </select>
              </div>
            )}
            {groupId === "new" && (
              <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 110px", marginTop: 6 }}>
                <input className="m3-input" placeholder={`Gom hộp rau ${clusterName}`} value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} maxLength={80} aria-label="Tên nhóm" />
                <input className="m3-input" type="number" min={2} max={50} value={minMembers} onChange={(e) => setMinMembers(Math.max(2, Number(e.target.value) || 2))} aria-label="Số người tối thiểu" title="Số người tối thiểu để miễn phí giao" />
              </div>
            )}
          </div>
        )}

        {mode === "single" && (
          <div className="m3-field">
            <label className="m3-field-label" htmlFor="op-note">Ghi chú</label>
            <input id="op-note" className="m3-input" placeholder="Ví dụ: gửi phòng bảo vệ giúp em" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          </div>
        )}

        <div className="m3-field">
          <label className="m3-field-label" htmlFor="op-care">{gift ? "Lời nhắn của người gửi (không bắt buộc)" : "Lời nhắn từ quê (không bắt buộc)"}</label>
          <textarea id="op-care" className="m3-textarea" rows={2} placeholder={gift ? "Bố mẹ nhắn gì cho con, lời nhắn sẽ đi cùng hộp rau" : mode === "subscription" ? "Để trống thì mỗi hộp kèm một lời nhắn của mẹ" : "Để trống thì hộp rau kèm một lời nhắn của mẹ"} value={careMessage} onChange={(e) => setCareMessage(e.target.value)} maxLength={CARE_MESSAGE_MAX} />
        </div>

        <div className="m3-field">
          <label className="m3-field-label">Thanh toán</label>
          {prepaid ? (
            <p className="body-sm text-on-surface-variant">{PAYMENT_METHOD_LABELS.transfer}{mode === "subscription" ? " mỗi kỳ" : ""}. {gift ? "Đơn đặt cho người thân được trả trước, người nhận không phải trả tiền." : "Gói định kỳ được trả trước khi chốt sổ."}</p>
          ) : (
            <div className="m3-button-group" style={{ display: "flex" }}>
              {(["transfer", "cod"] as const).map((p) => <button key={p} type="button" className={`m3-seg ${payment === p ? "selected" : ""}`} onClick={() => setPayment(p)} style={{ fontSize: 13, padding: "0 8px" }}>{PAYMENT_METHOD_LABELS[p]}</button>)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="m3-label">Số hộp</span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--md-primary-container)", color: "var(--md-on-primary-container)", borderRadius: "var(--shape-full)", padding: 3 }}>
            <button type="button" className="m3-icon-btn sm" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Bớt" style={{ background: "var(--md-surface-container-lowest)", color: "var(--md-on-surface)" }}><Icon name="remove" size={18} /></button>
            <input type="number" inputMode="numeric" min={1} max={20} value={qty} onChange={(e) => setQty(Math.min(20, Math.max(1, Math.floor(Number(e.target.value)) || 1)))} className="tabular" aria-label="Số hộp" style={{ width: 44, textAlign: "center", fontWeight: 700, fontSize: 15, background: "transparent", border: "none", outline: "none", color: "inherit" }} />
            <button type="button" className="m3-icon-btn sm filled" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Thêm"><Icon name="add" size={18} /></button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        <div className="flex justify-between body-md"><span className="text-on-surface-variant">{qty} × {box.name}</span><span className="tabular">{formatVND(subtotal)}</span></div>
        <div className="flex justify-between body-md"><span className="text-on-surface-variant">Phí giao ({formatVND(shipFeeFor(box.size))}/hộp size {box.size})</span><span className="tabular">{mode === "group" ? `${formatVND(ship)} (đủ nhóm: 0₫)` : formatVND(ship)}</span></div>
        <div className="flex justify-between items-baseline" style={{ marginTop: 6 }}><span className="title-md">Tổng{mode === "subscription" ? " mỗi kỳ" : ""}</span><span className="headline-sm text-primary tabular">{formatVND(subtotal + ship)}</span></div>
      </div>

      <button className="m3-btn m3-btn-filled m3-btn-lg m3-btn-block" style={{ marginTop: 14 }} onClick={submit} disabled={busy}>
        {busy ? <span className="m3-loader sm on-primary" /> : <Icon name={mode === "single" ? "shopping_bag" : mode === "subscription" ? "event_repeat" : "group_add"} filled />}
        <span>{!session ? "Đăng nhập để đặt" : mode === "single" ? "Đặt hộp rau" : mode === "subscription" ? "Đăng ký định kỳ" : group ? "Vào nhóm & đặt hộp" : "Tạo nhóm & đặt hộp"}</span>
      </button>
      <p className="body-sm text-on-surface-variant" style={{ textAlign: "center", marginTop: 8 }}>{payment_method === "transfer" ? "Chuyển khoản trước giờ chốt sổ." : "Trả tiền khi nhận hộp rau."} Giao {DELIVERY_DAYS_LABEL}, huỷ được trước 18h00 hôm trước ngày giao.</p>

      {placed && (
        <Portal>
          <div className="m3-scrim" aria-hidden />
          <div className="m3-dialog" role="dialog" aria-modal="true" style={{ textAlign: "center" }}>
            <div className="m3-empty-icon m3-celebrate" style={{ margin: "0 auto 12px", background: "var(--md-primary)", color: "var(--md-on-primary)" }}><Icon name="check" size={44} bold className="m3-check-in" /></div>
            <h2 className="headline-sm" style={{ marginBottom: 4 }}>Đơn đã vào sổ!</h2>
            <p className="body-md text-on-surface-variant" style={{ marginBottom: 14 }}>Sổ chốt 18h00 hôm trước, 4h sáng {formatYMD(placed.delivery_date)} bác nông dân cắt đúng phần {placed.recipient_name ? `của ${placed.recipient_name}` : "của bạn"}, 16h có tại điểm nhận.{placed.payment_method === "transfer" ? " Bạn chuyển khoản trước giờ chốt sổ nhé." : ""}</p>
            {placed.care_message && <p className="m3-care" style={{ textAlign: "left", marginBottom: 14 }}>{placed.care_message}<small>{placed.recipient_name ? "Lời nhắn của người gửi" : "Lời nhắn từ quê"}</small></p>}
            <div className="m3-list-group" style={{ textAlign: "left", marginBottom: 16 }}>
              <div className="m3-list-item" style={{ cursor: "default" }}><span className="m3-list-leading" style={{ width: 36, height: 36 }}><Icon name="payments" size={20} filled /></span><span className="body-md" style={{ fontWeight: 400 }}><strong>{formatVND(placed.impact.toFarmers)}</strong> là tiền mua rau trả tận vườn cho nông hộ Bắc Kạn, Tuyên Quang.</span></div>
              <div className="m3-list-item" style={{ cursor: "default" }}><span className="m3-list-leading" style={{ width: 36, height: 36 }}><Icon name="restaurant" size={20} filled /></span><span className="body-md" style={{ fontWeight: 400 }}><strong>{formatKg(placed.impact.weightKg)}</strong> rau củ, đủ <strong>{placed.impact.meals} bữa</strong> theo thực đơn kèm hộp.</span></div>
              <div className="m3-list-item" style={{ cursor: "default" }}><span className="m3-list-leading" style={{ width: 36, height: 36 }}><Icon name="eco" size={20} filled /></span><span className="body-md" style={{ fontWeight: 400 }}>Cắt đúng lượng đã đặt nên <strong>không có rau thừa</strong> bị bỏ đi.</span></div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href={`/don-hang/${placed.id}`} className="m3-btn m3-btn-filled"><Icon name="package_2" /><span>Theo dõi hộp rau</span></Link>
              <button className="m3-btn m3-btn-text" onClick={() => setPlaced(null)}>Đóng</button>
            </div>
          </div>
        </Portal>
      )}
    </aside>
  );
}
