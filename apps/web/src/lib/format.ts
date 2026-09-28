export const formatVND = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}₫`;

export const formatDate = (d: Date | string, opts?: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleDateString("vi-VN", opts ?? { day: "numeric", month: "long" });

const TZ = "Asia/Ho_Chi_Minh";

/** "Thứ Bảy, 26 tháng 9 · 14:05" in Vietnam time regardless of server timezone. */
export const formatDateTime = (d: Date | string) => {
  const x = new Date(d);
  const day = x.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
  const time = x.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return `${day} · ${time}`;
};

/** "vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước"; falls back to a date after a week. */
export const timeAgo = (d: Date | string) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(d).toLocaleDateString("vi-VN", { day: "numeric", month: "long", timeZone: TZ });
};

/** Shared status labels end with an emoji for mobile; the web uses icons instead. */
export const stripEmoji = (s: string) => s.replace(/\s*(?:[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF])\uFE0F?\s*$/, "").trim();

export const daysUntil = (d: Date | string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);

export const CATEGORY_LABELS: Record<string, string> = { rau_la: "Rau lá", cu_qua: "Củ quả" };
export const CATEGORY_ICONS: Record<string, string> = { rau_la: "eco", cu_qua: "nutrition" };

export const ORDER_TYPE_LABELS: Record<string, string> = { single: "Đơn lẻ", subscription: "Định kỳ", group: "Gom đơn" };
export const ORDER_TYPE_ICONS: Record<string, string> = { single: "shopping_bag", subscription: "event_repeat", group: "groups" };

export const STATUS_SHORT: Record<string, string> = { placed: "Đã vào sổ", harvesting: "Đang thu hoạch", loaded: "Trên xe lạnh", delivered: "Đã tới sảnh", cancelled: "Đã huỷ" };
export const STATUS_ICONS: Record<string, string> = { placed: "inventory", harvesting: "agriculture", loaded: "local_shipping", delivered: "apartment", cancelled: "cancel" };

export const RUN_STATUS_LABELS: Record<string, string> = { allocated: "Đã gửi lệnh", harvesting: "Đang thu hoạch", loaded: "Trên xe lạnh", delivered: "Đã tới sảnh" };

/** "04:00" style clock time in Vietnam. */
export const formatClock = (d: Date | string) => new Date(d).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
