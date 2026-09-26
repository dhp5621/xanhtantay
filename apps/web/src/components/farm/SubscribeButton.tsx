"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";

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

  const eligible = cart.farmId === farmId && cart.lines.length > 0;
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
        body: JSON.stringify({ farm_id: farmId, frequency: freq, items: cart.lines.map((l) => ({ product_id: l.id, quantity: l.quantity })) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Không đăng ký được");
      cart.clear();
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
        <>
          <div className={`m3-scrim ${closing ? "closing" : ""}`} onClick={close} aria-hidden />
          <div className={`m3-dialog ${closing ? "closing" : ""}`} role="dialog" aria-modal="true">
            <h2 className="headline-sm" style={{ marginBottom: 4 }}>Giao định kỳ</h2>
            <p className="body-md text-on-surface-variant" style={{ marginBottom: 20 }}>
              {cart.count} món trong giỏ sẽ tự động được đặt lại theo lịch bạn chọn.
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
        </>
      )}
    </>
  );
}
