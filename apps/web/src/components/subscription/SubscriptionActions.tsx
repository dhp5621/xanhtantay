"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";

export function SubscriptionActions({ id, active, farmSlug }: { id: string; active: boolean; farmSlug?: string | null }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { show } = useSnackbar();

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !active }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Không cập nhật được");
      show(active ? "Đã tạm dừng gói. Bật lại bất cứ lúc nào." : "Gói đã hoạt động trở lại", { kind: "success" });
      router.refresh();
    } catch (e) {
      show(e instanceof Error ? e.message : "Có lỗi xảy ra", { kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {farmSlug && (
        <a href={`/farms/${farmSlug}`} className="m3-btn m3-btn-outlined m3-btn-sm">
          <Icon name="edit" size={18} /><span>Đổi món</span>
        </a>
      )}
      <button className={`m3-btn m3-btn-sm ${active ? "m3-btn-outlined is-error" : "m3-btn-tonal-primary"}`} onClick={toggle} disabled={loading}>
        <Icon name={active ? "pause_circle" : "play_circle"} size={18} />
        <span>{active ? "Tạm dừng" : "Kích hoạt lại"}</span>
      </button>
    </div>
  );
}
