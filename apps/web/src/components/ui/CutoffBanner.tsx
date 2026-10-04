"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

/**
 * "Đặt trước 18h00 thứ Ba 29/9, giao thứ Tư 30/9" with a live countdown to the cut-off.
 * Boxes are delivered on Wednesdays and Sundays only; the book for each closes at 18:00 the day before.
 */
export function CutoffBanner({ cutoffAt, deliveryLabel, compact = false }: { cutoffAt: string; deliveryLabel: string; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const left = now === null ? null : Math.max(0, new Date(cutoffAt).getTime() - now);
  const h = left === null ? 0 : Math.floor(left / 3_600_000), m = left === null ? 0 : Math.floor((left % 3_600_000) / 60_000);
  const urgent = left !== null && left < 2 * 3_600_000;
  const d = left === null ? 0 : Math.floor(left / 86_400_000);
  // The cut-off day in Vietnam time, the same string on the server and in the browser.
  const cutoffDay = new Date(cutoffAt).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
  return (
    <div className={`m3-cutoff ${urgent ? "urgent" : ""} ${compact ? "compact" : ""}`} role="status">
      <span className="m3-cutoff-icon"><Icon name="schedule" filled /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="title-sm">Đặt trước 18h00 {cutoffDay}, giao {deliveryLabel}</p>
        <p className="body-sm" style={{ opacity: 0.85 }}>{left === null ? "Giao cố định thứ Tư và Chủ nhật, chốt sổ 18h00 hôm trước" : left === 0 ? "Đã qua giờ chốt, đơn mới sẽ vào chuyến giao kế tiếp (thứ Tư hoặc Chủ nhật)" : `Còn ${d > 0 ? `${d} ngày ` : ""}${h % 24 > 0 ? `${h % 24} giờ ` : ""}${m} phút tới giờ chốt sổ · giao thứ Tư và Chủ nhật`}</p>
      </div>
    </div>
  );
}
