"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";

const KEY = "xtt-follows";

export function FollowFarmButton({ farmId, farmName }: { farmId: string; farmName: string }) {
  const [following, setFollowing] = useState(false);
  const { show } = useSnackbar();

  useEffect(() => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      setFollowing(list.includes(farmId));
    } catch {}
  }, [farmId]);

  const toggle = () => {
    let list: string[] = [];
    try { list = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch {}
    const next = following ? list.filter((x) => x !== farmId) : Array.from(new Set([...list, farmId]));
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setFollowing(!following);
    show(following ? `Đã bỏ theo dõi ${farmName}` : `Sẽ báo bạn khi ${farmName} lên sóng`, { kind: "success", duration: 2500 });
  };

  return (
    <button className={`m3-btn ${following ? "m3-btn-filled" : "m3-btn-tonal"}`} onClick={toggle} style={{ whiteSpace: "nowrap" }} aria-pressed={following}>
      <Icon name={following ? "notifications_active" : "notifications"} filled={following} size={20} />
      <span>{following ? "Đang theo dõi" : "Theo dõi"}</span>
    </button>
  );
}
