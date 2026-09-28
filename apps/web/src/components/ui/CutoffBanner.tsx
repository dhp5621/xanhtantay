"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

/** "Đặt trước 18h00 hôm nay, giao thứ Ba 29/9" with a live countdown to the cut-off. */
export function CutoffBanner({ cutoffAt, deliveryLabel, compact = false }: { cutoffAt: string; deliveryLabel: string; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const left = now === null ? null : Math.max(0, new Date(cutoffAt).getTime() - now);
  const h = left === null ? 0 : Math.floor(left / 3_600_000), m = left === null ? 0 : Math.floor((left % 3_600_000) / 60_000);
  const urgent = left !== null && left < 2 * 3_600_000;
  return (
    <div className={`m3-cutoff ${urgent ? "urgent" : ""} ${compact ? "compact" : ""}`} role="status">
      <span className="m3-cutoff-icon"><Icon name="schedule" filled /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="title-sm">Đặt trước 18h00, giao {deliveryLabel}</p>
        <p className="body-sm" style={{ opacity: 0.85 }}>{left === null ? "18h00 chốt sổ, 4h sáng bác nông dân cắt đúng phần của bạn" : left === 0 ? "Đã qua giờ chốt, đơn mới sẽ giao ngày kế tiếp" : `Còn ${h > 0 ? `${h} giờ ` : ""}${m} phút tới giờ chốt sổ`}</p>
      </div>
    </div>
  );
}
