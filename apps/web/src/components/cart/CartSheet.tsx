"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "./CartProvider";
import { useSnackbar } from "@/components/ui/Snackbar";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { QtyInput } from "./QtyInput";
import { formatVND } from "@/lib/format";
import { MIN_DIRECT_ORDER, levelFor } from "@/lib/commerce";

interface PlacedOrder { id: string; total: number; farm: { name: string; location: string }; impact: { toFarmer: number; kg: number; pieces: number; servings: number; region: string; points: number } }

export function CartSheet() {
  const cart = useCart();
  const { show } = useSnackbar();
  const router = useRouter();
  const { data: session } = useSession();
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder[] | null>(null);
  const [pointsBefore, setPointsBefore] = useState<number | null>(null);

  const close = () => {
    setClosing(true);
    setTimeout(() => { setClosing(false); cart.close(); setPlaced(null); }, 280);
  };

  useEffect(() => {
    if (!cart.isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (session) fetch("/api/users/points").then((r) => (r.ok ? r.json() : null)).then((d) => d && setPointsBefore(d.points)).catch(() => {});
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.isOpen]);

  if (!cart.isOpen) return null;

  const checkout = async () => {
    if (!session) { close(); router.push("/dang-nhap?role=customer"); return; }
    setSubmitting(true);
    const batch_id = `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const done: PlacedOrder[] = [];
    try {
      // One order per farm; a failure on one farm keeps that farm's lines in the cart.
      for (const g of cart.groups) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ farm_id: g.farm_id, note: note.trim() || undefined, batch_id, items: g.lines.map((l) => ({ product_id: l.id, quantity: l.quantity })) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { show(`${g.farm_name}: ${data?.error ?? "không đặt được"}`, { kind: "error", duration: 6000 }); continue; }
        done.push(data);
        cart.clearFarm(g.farm_id);
      }
      if (done.length) { setPlaced(done); setNote(""); router.refresh(); }
    } finally {
      setSubmitting(false);
    }
  };

  const pooledGroups = cart.groups.filter((g) => g.subtotal < MIN_DIRECT_ORDER);

  return (
    <Portal>
      <div className={`m3-scrim ${closing ? "closing" : ""}`} onClick={close} aria-hidden />
      <section className={`m3-sheet ${closing ? "closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="m3-sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 20px 4px" }}>
          <span className="m3-list-leading" style={{ width: 40, height: 40 }}><Icon name="shopping_basket" filled /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="cart-title" className="title-lg">Giỏ rau của bạn</h2>
            {cart.groups.length > 0 && <p className="body-sm text-on-surface-variant">{cart.groups.length} vườn · {cart.count} món</p>}
          </div>
          <button className="m3-icon-btn" onClick={close} aria-label="Đóng"><Icon name="close" /></button>
        </div>

        <div className="m3-sheet-body">
          {placed ? (
            <SuccessView orders={placed} pointsBefore={pointsBefore} onClose={close} />
          ) : cart.lines.length === 0 ? (
            <div className="m3-empty" style={{ background: "transparent", padding: "32px 8px" }}>
              <span className="m3-empty-icon"><Icon name="grocery" size={40} /></span>
              <p className="title-md">Giỏ còn trống</p>
              <p className="body-sm text-on-surface-variant">Ghé một vườn rau và chọn vài món tươi nhé.</p>
              <button className="m3-btn m3-btn-tonal" style={{ marginTop: 8 }} onClick={() => { close(); router.push("/rau-cu"); }}>
                <Icon name="nutrition" /><span>Xem rau củ</span>
              </button>
            </div>
          ) : (
            <>
              {cart.groups.map((g) => (
                <div key={g.farm_id} style={{ marginBottom: 14 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <p className="label-lg text-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="potted_plant" size={18} filled /> {g.farm_name}</p>
                    {g.subtotal < MIN_DIRECT_ORDER ? (
                      <span className="m3-chip sm round m3-chip-tertiary" title={`Đơn dưới ${formatVND(MIN_DIRECT_ORDER)} được ghép chuyến với hàng xóm`}><Icon name="group_work" size={14} /> Ghép đơn</span>
                    ) : (
                      <span className="m3-chip sm round m3-chip-primary"><Icon name="local_shipping" size={14} filled /> Giao riêng</span>
                    )}
                  </div>
                  <ul className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
                    {g.lines.map((l) => (
                      <li key={l.id} className="m3-card-filled" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px 10px 16px", borderRadius: "var(--shape-lg)" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="title-sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</p>
                          <p className="body-sm text-on-surface-variant">{formatVND(l.price_per_unit)} / {l.unit}</p>
                        </div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "var(--md-surface-container-lowest)", borderRadius: "var(--shape-full)", padding: 2 }}>
                          <button className="m3-icon-btn sm" onClick={() => cart.setQty(l.id, l.quantity - 1)} aria-label="Giảm"><Icon name={l.quantity === 1 ? "delete" : "remove"} size={18} /></button>
                          <QtyInput value={l.quantity} onCommit={(n) => cart.setQty(l.id, n)} />
                          <button className="m3-icon-btn sm" onClick={() => cart.setQty(l.id, l.quantity + 1)} aria-label="Tăng"><Icon name="add" size={18} /></button>
                        </div>
                        <p className="label-lg tabular text-primary" style={{ minWidth: 76, textAlign: "right" }}>{formatVND(l.price_per_unit * l.quantity)}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="body-sm text-on-surface-variant" style={{ textAlign: "right", marginTop: 4 }}>Vườn này: <strong className="tabular">{formatVND(g.subtotal)}</strong></p>
                </div>
              ))}

              {pooledGroups.length > 0 && (
                <div className="m3-card-filled" style={{ padding: "10px 14px", borderRadius: "var(--shape-md)", background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
                  <Icon name="group_work" size={20} filled />
                  <p className="body-sm">Đơn dưới {formatVND(MIN_DIRECT_ORDER)} mỗi vườn sẽ được <strong>ghép chuyến</strong> với hàng xóm để tiết kiệm phí, giao trong 1–2 ngày. Đặt đủ {formatVND(MIN_DIRECT_ORDER)} hoặc dùng gói định kỳ để giao riêng ngay hôm sau.</p>
                </div>
              )}

              <div className="m3-field" style={{ marginBottom: 16 }}>
                <label className="m3-field-label" htmlFor="cart-note">Ghi chú cho bác nông dân</label>
                <input id="cart-note" className="m3-input" placeholder="Ví dụ: giao buổi sáng, gọi trước 15 phút…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <span className="body-md text-on-surface-variant">{cart.groups.length > 1 ? `${cart.groups.length} đơn, mỗi vườn một đơn` : `${cart.count} món`}</span>
                <span className="headline-sm text-primary tabular">{formatVND(cart.total)}</span>
              </div>

              <button className="m3-btn m3-btn-filled m3-btn-lg m3-btn-block" onClick={checkout} disabled={submitting}>
                {submitting ? <span className="m3-loader sm on-primary" /> : <Icon name="shopping_bag" filled />}
                <span>{submitting ? "Đang đặt hàng…" : session ? (cart.groups.length > 1 ? `Đặt ${cart.groups.length} đơn` : "Đặt hàng ngay") : "Đăng nhập để đặt"}</span>
              </button>
              <p className="body-sm text-on-surface-variant" style={{ textAlign: "center", marginTop: 10 }}>Thanh toán khi nhận hàng (COD). Mỗi đơn giao xong tích 1 điểm / 1.000₫.</p>
            </>
          )}
        </div>
      </section>
    </Portal>
  );
}

function SuccessView({ orders, pointsBefore, onClose }: { orders: PlacedOrder[]; pointsBefore: number | null; onClose: () => void }) {
  const router = useRouter();
  const toFarmers = orders.reduce((s, o) => s + o.impact.toFarmer, 0);
  const kg = orders.reduce((s, o) => s + o.impact.kg, 0);
  const pieces = orders.reduce((s, o) => s + o.impact.pieces, 0);
  const servings = orders.reduce((s, o) => s + o.impact.servings, 0);
  const points = orders.reduce((s, o) => s + o.impact.points, 0);
  const regions = Array.from(new Set(orders.map((o) => o.impact.region)));
  const after = (pointsBefore ?? 0) + points;
  const lv = levelFor(after);
  const levelUp = pointsBefore !== null && levelFor(pointsBefore).index < lv.index;

  const facts = [
    { icon: "payments", text: <>Bạn vừa gửi thẳng <strong>{formatVND(toFarmers)}</strong> đến nhà vườn ở <strong>{regions.join(", ")}</strong>, không qua thương lái.</> },
    { icon: "restaurant", text: <>{kg > 0 ? <><strong>{kg} kg</strong> rau củ{pieces > 0 ? ` và ${pieces} bó/củ` : ""}</> : <><strong>{pieces}</strong> bó/củ tươi</>} là khoảng <strong>{servings} phần ăn</strong> có rau xanh cho cả nhà.</> },
    { icon: "eco", text: <>Rau hái theo đơn nên không có gì bị bỏ đi. Cơ thể bạn và luống rau của bác đều khoẻ hơn.</> },
  ];

  return (
    <div className="anim-in-scale" style={{ padding: "8px 0 4px" }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div className="m3-empty-icon m3-celebrate" style={{ margin: "0 auto 12px", background: "var(--md-primary)", color: "var(--md-on-primary)" }}>
          <Icon name="check" size={44} bold className="m3-check-in" />
        </div>
        <h3 className="headline-sm">{orders.length > 1 ? `Đã đặt ${orders.length} đơn!` : "Đặt hàng thành công!"}</h3>
        <p className="body-sm text-on-surface-variant">Bác nông dân sẽ hái đúng phần của bạn vào sáng mai.</p>
      </div>

      <div className="m3-list-group stagger" style={{ marginBottom: 14 }}>
        {facts.map((f, i) => (
          <div key={i} className="m3-list-item" style={{ cursor: "default", alignItems: "flex-start" }}>
            <span className="m3-list-leading" style={{ width: 36, height: 36 }}><Icon name={f.icon} size={20} filled /></span>
            <p className="body-md" style={{ fontWeight: 400, lineHeight: 1.5 }}>{f.text}</p>
          </div>
        ))}
      </div>

      <div className="m3-card-filled" style={{ padding: "14px 16px", borderRadius: "var(--shape-lg)", background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)", marginBottom: 16 }}>
        <div className="flex items-center gap-3">
          <Icon name={lv.level.icon} size={30} filled />
          <div style={{ flex: 1 }}>
            <p className="title-sm">+{points} điểm khi giao xong{levelUp ? ` · Lên hạng ${lv.level.name}!` : ""}</p>
            <p className="body-sm" style={{ opacity: 0.85 }}>Cây của bạn: <strong>{lv.level.name}</strong>{lv.next ? ` · còn ${Math.max(0, lv.next.min - after)} điểm tới ${lv.next.name}` : ""}</p>
          </div>
        </div>
        <div className="m3-progress" style={{ marginTop: 10, background: "rgba(0,0,0,.12)" }}><div className="m3-progress-bar" style={{ width: `${lv.progress * 100}%`, background: "var(--md-on-tertiary-container)" }} /></div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="m3-btn m3-btn-filled" onClick={() => { onClose(); router.push("/don-hang"); }}><Icon name="package_2" /><span>Xem đơn hàng</span></button>
        <Link href="/vuon-cua-toi" className="m3-btn m3-btn-tonal" onClick={onClose}><Icon name="park" /><span>Vườn của tôi</span></Link>
        <button className="m3-btn m3-btn-text" onClick={onClose}>Tiếp tục mua</button>
      </div>
    </div>
  );
}
