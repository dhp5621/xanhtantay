export const formatVND = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}₫`;

/** "2,5 kg" / "15 kg" — Vietnamese decimal comma, no trailing zeros. */
export const formatKg = (n: number) => `${(Math.round(Number(n) * 100) / 100).toString().replace(".", ",")} kg`;

const TZ = "Asia/Ho_Chi_Minh";
const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const DAY_MS = 86_400_000;

/**
 * `*_date` / `next_delivery` values are plain "YYYY-MM-DD" days. `new Date("2025-09-29")` would read
 * them as UTC midnight and can land on the previous day, so they are parsed as local calendar days.
 */
function parseDay(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
}

const startOfToday = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

/** "Thứ Ba, 29 tháng 9" */
export function formatDay(s: string) {
  const d = parseDay(s);
  if (Number.isNaN(d.getTime())) return s;
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`;
}

/** "14:05" in Vietnam time regardless of device timezone. */
export const formatClock = (d: Date | string) => new Date(d).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });

/** "Thứ Bảy, 26 tháng 9 · 14:05" in Vietnam time regardless of device timezone. */
export const formatDateTime = (d: Date | string) => {
  const x = new Date(d);
  const day = x.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
  return `${day} · ${formatClock(x)}`;
};

/** "14:05 · 26/9" — compact real timestamp for timeline rows. */
export const formatClockDay = (d: Date | string) => {
  const x = new Date(d);
  const day = x.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", timeZone: TZ });
  return `${formatClock(x)} · ${day}`;
};

/** "hôm nay" / "ngày mai" / "29/9" for the day an ISO timestamp falls on (device-local calendar). */
export function relativeDayOf(iso: string) {
  const x = new Date(iso);
  const diff = Math.round((new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() - startOfToday().getTime()) / DAY_MS);
  if (diff === 0) return "hôm nay";
  if (diff === 1) return "ngày mai";
  return `ngày ${x.getDate()}/${x.getMonth() + 1}`;
}

/** "3 giờ 12 phút", "12 phút 05 giây", or null once the moment has passed. */
export function formatCountdown(ms: number) {
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h >= 24) return `${Math.floor(h / 24)} ngày ${h % 24} giờ`;
  if (h > 0) return `${h} giờ ${String(m).padStart(2, "0")} phút`;
  return `${m} phút ${String(s).padStart(2, "0")} giây`;
}
