export const formatVND = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}₫`;

export const formatDate = (d: Date | string, opts?: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleDateString("vi-VN", opts ?? { day: "numeric", month: "long" });

export const daysUntil = (d: Date | string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);

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

export const ORDER_TYPE_LABELS: Record<string, string> = {
  single: "Đơn lẻ",
  subscription: "Đăng ký",
  group: "Gom đơn",
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
