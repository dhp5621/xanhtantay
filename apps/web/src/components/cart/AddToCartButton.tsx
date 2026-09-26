"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useCart, type CartProduct } from "./CartProvider";
import { useSnackbar } from "@/components/ui/Snackbar";
import { Icon } from "@/components/ui/Icon";

export function AddToCartButton({ product, compact = false }: { product: CartProduct; compact?: boolean }) {
  const cart = useCart();
  const { show } = useSnackbar();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [bump, setBump] = useState(false);
  const qty = cart.qtyOf(product.id);

  const pulse = () => { setBump(true); setTimeout(() => setBump(false), 350); };

  const add = () => {
    if (!session) {
      show("Đăng nhập để bắt đầu đặt rau nhé", {
        kind: "info",
        action: { label: "Đăng nhập", onClick: () => router.push(`/dang-nhap?next=${encodeURIComponent(pathname)}`) },
      });
      return;
    }
    const res = cart.add(product);
    if (res === "other-farm") {
      show(`Giỏ đang có rau của ${cart.farmName ?? "vườn khác"}. Mỗi đơn chỉ đặt từ một vườn.`, {
        kind: "info",
        duration: 6000,
        action: { label: "Đổi vườn", onClick: () => { cart.replaceWith(product); show(`Đã thêm ${product.name}`, { kind: "success" }); } },
      });
      return;
    }
    pulse();
    if (qty === 0) show(`Đã thêm ${product.name} vào giỏ`, { kind: "success", duration: 2500, action: { label: "Xem giỏ", onClick: cart.open } });
  };

  if (qty === 0) {
    return (
      <button onClick={add} className={`m3-btn m3-btn-tonal-primary ${compact ? "m3-btn-sm" : ""}`} style={{ whiteSpace: "nowrap" }} aria-label={`Thêm ${product.name}`}>
        <Icon name="add" size={compact ? 18 : 20} />
        <span>Thêm</span>
      </button>
    );
  }

  return (
    <div
      className="anim-in-scale"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "var(--md-primary-container)",
        borderRadius: "var(--shape-full)",
        padding: 3,
      }}
    >
      <button onClick={() => { cart.setQty(product.id, qty - 1); pulse(); }} className="m3-icon-btn sm" style={{ background: "var(--md-surface-container-lowest)", color: "var(--md-on-surface)" }} aria-label="Giảm">
        <Icon name={qty === 1 ? "delete" : "remove"} size={18} />
      </button>
      <span className={`tabular ${bump ? "m3-bump" : ""}`} style={{ minWidth: 24, textAlign: "center", fontWeight: 700, fontSize: 14, color: "var(--md-on-primary-container)" }}>
        {qty}
      </span>
      <button onClick={add} className="m3-icon-btn sm filled" aria-label="Tăng">
        <Icon name="add" size={18} />
      </button>
    </div>
  );
}
