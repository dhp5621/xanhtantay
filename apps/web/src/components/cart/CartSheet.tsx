"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "./CartProvider";
import { useSnackbar } from "@/components/ui/Snackbar";
import { Icon } from "@/components/ui/Icon";
import { formatVND } from "@/lib/format";

export function CartSheet() {
  const cart = useCart();
  const { show } = useSnackbar();
  const router = useRouter();
  const { data: session } = useSession();
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const close = () => {
    setClosing(true);
    setTimeout(() => { setClosing(false); cart.close(); setSuccess(null); }, 280);
  };

  useEffect(() => {
    if (!cart.isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.isOpen]);

  if (!cart.isOpen) return null;

  const checkout = async () => {
    if (!session) { close(); router.push("/dang-nhap"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farm_id: cart.farmId,
          note: note.trim() || undefined,
          items: cart.lines.map((l) => ({ product_id: l.id, quantity: l.quantity })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không đặt được đơn");
      setSuccess(data.id);
      cart.clear();
      setNote("");
      router.refresh();
    } catch (e) {
      show(e instanceof Error ? e.message : "Có lỗi xảy ra", { kind: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={`m3-scrim ${closing ? "closing" : ""}`} onClick={close} aria-hidden />
      <section className={`m3-sheet ${closing ? "closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="m3-sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 20px 4px" }}>
          <span className="m3-list-leading" style={{ width: 40, height: 40 }}><Icon name="shopping_basket" filled /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="cart-title" className="title-lg">Giỏ rau của bạn</h2>
            {cart.farmName && <p className="body-sm text-on-surface-variant">Từ {cart.farmName}</p>}
          </div>
          <button className="m3-icon-btn" onClick={close} aria-label="Đóng"><Icon name="close" /></button>
        </div>

        <div className="m3-sheet-body">
          {success ? (
            <div className="anim-in-scale" style={{ textAlign: "center", padding: "24px 8px 8px" }}>
              <div className="m3-empty-icon m3-celebrate" style={{ margin: "0 auto 16px", background: "var(--md-primary)", color: "var(--md-on-primary)" }}>
                <Icon name="check" size={44} bold className="m3-check-in" />
              </div>
              <h3 className="headline-sm" style={{ marginBottom: 6 }}>Đặt hàng thành công!</h3>
              <p className="body-md text-on-surface-variant" style={{ marginBottom: 20 }}>
                Bác nông dân sẽ bắt đầu thu hoạch cho bạn. Theo dõi hành trình rau trong mục Đơn hàng.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="m3-btn m3-btn-filled" onClick={() => { close(); router.push("/don-hang"); }}>
                  <Icon name="package_2" /><span>Xem đơn hàng</span>
                </button>
                <button className="m3-btn m3-btn-text" onClick={close}>Tiếp tục mua</button>
              </div>
            </div>
          ) : cart.lines.length === 0 ? (
            <div className="m3-empty" style={{ background: "transparent", padding: "32px 8px" }}>
              <span className="m3-empty-icon"><Icon name="grocery" size={40} /></span>
              <p className="title-md">Giỏ còn trống</p>
              <p className="body-sm text-on-surface-variant">Ghé một vườn rau và chọn vài món tươi nhé.</p>
              <button className="m3-btn m3-btn-tonal" style={{ marginTop: 8 }} onClick={() => { close(); router.push("/farms"); }}>
                <Icon name="potted_plant" /><span>Khám phá vườn</span>
              </button>
            </div>
          ) : (
            <>
              <ul className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", padding: 0, margin: "8px 0 16px" }}>
                {cart.lines.map((l) => (
                  <li key={l.id} className="m3-card-filled" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px 10px 16px", borderRadius: "var(--shape-lg)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="title-sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</p>
                      <p className="body-sm text-on-surface-variant">{formatVND(l.price_per_unit)} / {l.unit}</p>
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "var(--md-surface-container-lowest)", borderRadius: "var(--shape-full)", padding: 2 }}>
                      <button className="m3-icon-btn sm" onClick={() => cart.setQty(l.id, l.quantity - 1)} aria-label="Giảm">
                        <Icon name={l.quantity === 1 ? "delete" : "remove"} size={18} />
                      </button>
                      <span className="tabular label-lg" style={{ minWidth: 22, textAlign: "center" }}>{l.quantity}</span>
                      <button className="m3-icon-btn sm" onClick={() => cart.setQty(l.id, l.quantity + 1)} aria-label="Tăng">
                        <Icon name="add" size={18} />
                      </button>
                    </div>
                    <p className="label-lg tabular text-primary" style={{ minWidth: 76, textAlign: "right" }}>{formatVND(l.price_per_unit * l.quantity)}</p>
                  </li>
                ))}
              </ul>

              <div className="m3-field" style={{ marginBottom: 16 }}>
                <label className="m3-field-label" htmlFor="cart-note">Ghi chú cho bác nông dân</label>
                <input id="cart-note" className="m3-input" placeholder="Ví dụ: giao buổi sáng, gọi trước 15 phút…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <span className="body-md text-on-surface-variant">{cart.count} món · Freeship khi gom đủ nhóm</span>
                <span className="headline-sm text-primary tabular">{formatVND(cart.total)}</span>
              </div>

              <button className="m3-btn m3-btn-filled m3-btn-lg m3-btn-block" onClick={checkout} disabled={submitting}>
                {submitting ? <span className="m3-loader sm on-primary" /> : <Icon name="shopping_bag" filled />}
                <span>{submitting ? "Đang đặt hàng…" : session ? "Đặt hàng ngay" : "Đăng nhập để đặt"}</span>
              </button>
              <p className="body-sm text-on-surface-variant" style={{ textAlign: "center", marginTop: 10 }}>
                Thanh toán khi nhận hàng (COD). Tài khoản demo đặt hàng thật vào cơ sở dữ liệu demo.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
