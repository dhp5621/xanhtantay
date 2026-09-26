"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";

export function JoinGroupButton({ groupId, joined }: { groupId: string; joined: boolean }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(joined);
  const router = useRouter();
  const { data: session } = useSession();
  const { show } = useSnackbar();

  const join = async () => {
    if (!session) { router.push(`/dang-nhap?next=/gom-don/${groupId}`); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không tham gia được");
      setDone(true);
      show("Bạn đã vào nhóm! Rủ thêm hàng xóm để được freeship nhé.", { kind: "success" });
      router.refresh();
    } catch (e) {
      show(e instanceof Error ? e.message : "Có lỗi xảy ra", { kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="m3-chip m3-chip-primary round anim-in-scale" style={{ height: 44, padding: "0 20px", fontSize: 14 }}>
        <Icon name="check_circle" filled size={20} />
        Bạn đã tham gia nhóm này
      </div>
    );
  }
  return (
    <button className="m3-btn m3-btn-filled m3-btn-lg" onClick={join} disabled={loading}>
      {loading ? <span className="m3-loader sm on-primary" /> : <Icon name="group_add" />}
      <span>{loading ? "Đang tham gia…" : "Tham gia nhóm này"}</span>
    </button>
  );
}
