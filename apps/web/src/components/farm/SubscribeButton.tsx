"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { useSnackbar } from "@/components/ui/Snackbar";
import { formatVND } from "@/lib/format";

/** Turns the current cart (for this farm) into a weekly/monthly subscription. */
export function SubscribeButton({ farmId }: { farmId: string }) {
  const cart = useCart();
  const { data: session } = useSession();
  const router = useRouter();
  const { show } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [freq, setFreq] = useState<"weekly" | "monthly">("weekly");
  const [loading, setLoading] = useState(false);

  const farmLines = cart.linesOf(farmId);
  const eligible = farmLines.length > 0;
  const close = () => { setClosing(true); setTimeout(() => { setClosing(false); setOpen(false); }, 250); };

  const start = () => {
    if (!session) { router.push("/dang-nhap"); return; }
    if (!eligible) { show("Thêm vài món của vườn này vào giỏ trước, rồi đăng ký giao định kỳ.", { kind: "info" }); return; }
    setOpen(true);
  };

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farm_id: farmId, frequency: freq, items: farmLines.map((l) => ({ product_id: l.id, quantity: l.quantity })) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Không đăng ký được");
      cart.clearFarm(farmId);
      close();
      show("Đã tạo gói giao định kỳ!", { kind: "success", action: { label: "Xem gói", onClick: () => router.push("/dang-ky") } });
      router.refresh();
    } catch (e) {
      show(e instanceof Error ? e.message : "Có lỗi xảy ra", { kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="m3-btn m3-btn-outlined" onClick={start}>
        <Icon name="event_repeat" size={20} /><span>Giao định kỳ</span>
      </button>
      {open && (
        <Portal>
          <div className={`m3-scrim ${closing ? "closing" : ""}`} onClick={close} aria-hidden />
          <div className={`m3-dialog ${closing ? "closing" : ""}`} role="dialog" aria-modal="true">
            <h2 className="headline-sm" style={{ marginBottom: 4 }}>Giao định kỳ</h2>
            <p className="body-md text-on-surface-variant" style={{ marginBottom: 12 }}>
              Những món dưới đây (đang trong giỏ, thuộc vườn này) sẽ tự động được đặt lại theo lịch bạn chọn. Các món của vườn khác vẫn ở trong giỏ.
            </p>
            <ul className="m3-list-group" style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
              {farmLines.map((l) => (
                <li key={l.id} className="m3-list-item" style={{ cursor: "default", padding: "10px 14px" }}>
                  <span className="m3-list-leading" style={{ width: 36, height: 36 }}><Icon name="eco" size={20} filled /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="title-sm" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
                    <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{formatVND(l.price_per_unit)} / {l.unit}</span>
                  </span>
                  <span className="label-lg tabular">{l.quantity} {l.unit}</span>
                  <span className="body-sm text-on-surface-variant tabular" style={{ minWidth: 72, textAlign: "right" }}>{formatVND(l.price_per_unit * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="body-sm text-on-surface-variant" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between" }}>
              <span>{farmLines.length} món · {farmLines.reduce((s, l) => s + l.quantity, 0)} đơn vị</span>
              <span>Mỗi kỳ ≈ <strong className="tabular text-primary">{formatVND(farmLines.reduce((s, l) => s + l.quantity * l.price_per_unit, 0))}</strong></span>
            </p>
            <div className="m3-button-group" style={{ width: "100%", marginBottom: 24 }}>
              {(["weekly", "monthly"] as const).map((f) => (
                <button key={f} type="button" className={`m3-seg ${freq === f ? "selected" : ""}`} onClick={() => setFreq(f)}>
                  <Icon name={f === "weekly" ? "date_range" : "calendar_month"} size={18} />
                  {f === "weekly" ? "Mỗi tuần" : "Mỗi tháng"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="m3-btn m3-btn-text" onClick={close}>Huỷ</button>
              <button className="m3-btn m3-btn-filled" onClick={submit} disabled={loading}>
                {loading ? <span className="m3-loader sm on-primary" /> : <Icon name="check" />}
                <span>Đăng ký</span>
              </button>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
