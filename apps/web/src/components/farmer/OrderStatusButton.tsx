"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";

const NEXT: Record<string, { status: string; label: string; icon: string }> = {
  harvesting: { status: "loaded", label: "Đã lên xe", icon: "local_shipping" },
  loaded: { status: "delivered", label: "Đã giao", icon: "home" },
};

export function OrderStatusButton({ orderId, status }: { orderId: string; status: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { show } = useSnackbar();
  const next = NEXT[status];
  if (!next) return null;

  const advance = async () => {
    setLoading(true);
    try {
      // The API only accepts PATCH with a JSON body; the old <form method="POST"> never worked.
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next.status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không cập nhật được");
      show(`Đã cập nhật: ${next.label}`, { kind: "success" });
      router.refresh();
    } catch (e) {
      show(e instanceof Error ? e.message : "Có lỗi xảy ra", { kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className="m3-btn m3-btn-tonal-primary" onClick={advance} disabled={loading}>
      {loading ? <span className="m3-loader sm" /> : <Icon name={next.icon} size={20} />}
      <span>{next.label}</span>
    </button>
  );
}
