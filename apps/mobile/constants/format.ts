// Mirrors apps/web/src/lib/format.ts (icons become emoji since the app has no icon font).
export const formatVND = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}₫`;

export const formatDate = (d: Date | string, opts?: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleDateString("vi-VN", opts ?? { day: "numeric", month: "long" });

const TZ = "Asia/Ho_Chi_Minh";

/** "Thứ Bảy, 26 tháng 9 · 14:05" in Vietnam time regardless of device timezone. */
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

export const daysUntil = (d: Date | string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);

export const CATEGORY_LABELS: Record<string, string> = {
  rau_la: "Rau lá",
  cu_qua: "Củ quả",
  rau_thom: "Rau thơm",
  rau_mam: "Rau mầm",
};

export const CATEGORY_ICONS: Record<string, string> = {
  rau_la: "eco",
  cu_qua: "nutrition",
  rau_thom: "spa",
  rau_mam: "grass",
};

export const STATUS_SHORT: Record<string, string> = {
  harvesting: "Đang thu hoạch",
  loaded: "Đang giao",
  delivered: "Đã giao",
};

export const STATUS_ICONS: Record<string, string> = {
  harvesting: "agriculture",
  loaded: "local_shipping",
  delivered: "home",
};

/** Normalise Vietnamese for search: lowercase, strip diacritics. */
export const normalizeSearch = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

/** Product name without brand words so "Cà rốt Đà Lạt" and "Cà rốt" meet. */
export const baseName = (n: string) => n.replace(/\s*\((.*?)\)\s*/g, " ").trim();
