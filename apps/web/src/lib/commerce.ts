/** Business rules shared by the order API, the brain and the UI. All clock logic is Vietnam time (UTC+7, no DST). */

export const CUTOFF_HOUR = 18;          // the book for a delivery day closes at 18:00 the day before
export const HARVEST_TIME = "4:00";     // farmers cut at 4 am
export const PICKUP_TIME = "6:00";      // cold truck picks up
export const ARRIVAL_TIME = "16:00";    // boxes reach the pickup point
/** Delivery fee per box, by size, paid by the customer on one-off orders and subscriptions. A group that fills ships free. */
export const SHIP_FEES: Record<string, number> = { S: 15_000, M: 20_000, L: 30_000 };
/** Paid to the farms at the garden for each box, by size. This is the "tiền về tay nông hộ" figure. */
export const FARM_PAYOUT: Record<string, number> = { S: 65_000, M: 112_000, L: 185_000 };
/** Allowance for the village team that sorts and packs each box, by size. */
export const VILLAGE_ALLOWANCE: Record<string, number> = { S: 7_000, M: 12_000, L: 20_000 };
/** Boxes are delivered twice a week on fixed days: Wednesday (3) and Sunday (0). */
export const DELIVERY_WEEKDAYS = [3, 0];
export const DELIVERY_DAYS_LABEL = "thứ Tư và Chủ nhật";
/** A harvest batch is only opened automatically from this many boxes (env MIN_BATCH_BOXES, read on the server in lib/brain). */
export const DEFAULT_MIN_BATCH_BOXES = 240;
/** How farms are paid, shown with every harvest command. Payout accounting is done outside the app. */
export const PAYOUT_RULE = "Thanh toán: 50% khi chuyến hàng được xác nhận, 50% còn lại trong 48 giờ sau khi giao xong.";
export const PILOT_CITY = "Hà Nội";
export const SOURCE_PROVINCES = ["Bắc Kạn", "Tuyên Quang"];

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/** A Date whose UTC fields read as Vietnam wall-clock time. */
export const vnClock = (at: Date = new Date()) => new Date(at.getTime() + VN_OFFSET_MS);
export const toYMD = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const todayVN = (at: Date = new Date()) => toYMD(vnClock(at));
export function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return toYMD(d);
}

export const isDeliveryDay = (ymd: string) => DELIVERY_WEEKDAYS.includes(new Date(`${ymd}T00:00:00Z`).getUTCDay());
/** The first delivery day (Wednesday or Sunday) on or after `ymd`. */
export function deliveryDayOnOrAfter(ymd: string) {
  let d = ymd;
  while (!isDeliveryDay(d)) d = addDays(d, 1);
  return d;
}
/** The last delivery day on or before `ymd`. */
export function deliveryDayOnOrBefore(ymd: string) {
  let d = ymd;
  while (!isDeliveryDay(d)) d = addDays(d, -1);
  return d;
}

/** The earliest delivery day still open: the first Wednesday or Sunday whose cut-off (18:00 the day before) has not passed. */
export function nextDeliveryDate(at: Date = new Date()) {
  const vn = vnClock(at);
  return deliveryDayOnOrAfter(addDays(toYMD(vn), vn.getUTCHours() < CUTOFF_HOUR ? 1 : 2));
}
/** Every delivery day from `from` up to `days` days later: the days a group or a subscription may pick. */
export function deliveryDates(from: string, days = 14) {
  const out: string[] = [];
  for (let i = 0; i <= days; i++) { const d = addDays(from, i); if (isDeliveryDay(d)) out.push(d); }
  return out;
}

/** The instant (real UTC Date) at which orders for `deliveryDate` close: 18:00 VN the day before. */
export function cutoffInstant(deliveryDate: string) {
  const d = new Date(`${addDays(deliveryDate, -1)}T${pad(CUTOFF_HOUR)}:00:00Z`);
  return new Date(d.getTime() - VN_OFFSET_MS);
}
export const isPastCutoff = (deliveryDate: string, at: Date = new Date()) => at.getTime() >= cutoffInstant(deliveryDate).getTime();

/** A VN wall-clock time on a given date as a real instant, e.g. vnInstant("2026-09-29", "4:00"). */
export function vnInstant(ymd: string, hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return new Date(new Date(`${ymd}T${pad(h)}:${pad(m ?? 0)}:00Z`).getTime() - VN_OFFSET_MS);
}

export const formatYMD = (ymd: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "numeric" }) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString("vi-VN", { ...opts, timeZone: "UTC" });

export const FREQUENCY_DAYS: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 28 };
export const FREQUENCY_LABELS: Record<string, string> = { weekly: "Mỗi tuần", biweekly: "Hai tuần một lần", monthly: "Mỗi tháng" };
export const SIZE_LABELS: Record<string, string> = { S: "Size S", M: "Size M", L: "Size L" };
export const SIZE_NAMES: Record<string, string> = { S: "Nhỏ", M: "Vừa", L: "Lớn" };
export const SIZE_ORDER = ["S", "M", "L"];

/** Delivery fee for `quantity` boxes of one size. Groups pay it too until they fill at cut-off. */
export const shipFeeFor = (size: string, quantity = 1) => (SHIP_FEES[size] ?? SHIP_FEES.M) * quantity;
/** What the farms are paid at the garden for `quantity` boxes of one size. */
export const farmPayoutFor = (size: string, quantity = 1) => (FARM_PAYOUT[size] ?? 0) * quantity;

/** A subscription's next box may be moved to another delivery day until this long before its cut-off. */
export const MOVE_NOTICE_HOURS = 24;
export const canMoveDelivery = (nextDelivery: string, at: Date = new Date()) => at.getTime() < cutoffInstant(nextDelivery).getTime() - MOVE_NOTICE_HOURS * 3_600_000;

export const PAYMENT_METHOD_LABELS: Record<string, string> = { transfer: "Chuyển khoản trước", cod: "Trả khi nhận hàng" };
export const PAYMENT_STATUS_LABELS: Record<string, string> = { pending: "Chưa thanh toán", paid: "Đã thanh toán" };

export const RECIPIENT_NAME_MAX = 80;
/**
 * "Đặt cho người thân": who eats the box when the buyer orders for someone else. Both fields or neither.
 * Nulls when no recipient was given; `error` when only one of the two is usable.
 */
export function recipientFrom(name: unknown, phone: unknown): { recipient_name: string | null; recipient_phone: string | null; error?: string } {
  const n = typeof name === "string" ? name.trim().slice(0, RECIPIENT_NAME_MAX) : "";
  const p = typeof phone === "string" ? phone.replace(/[^0-9+]/g, "") : "";
  if (!n && !p) return { recipient_name: null, recipient_phone: null };
  if (n.length < 2) return { recipient_name: null, recipient_phone: null, error: "Nhập tên người nhận" };
  if (!/^(0|\+84)[0-9]{9,10}$/.test(p)) return { recipient_name: null, recipient_phone: null, error: "Số điện thoại người nhận chưa đúng" };
  return { recipient_name: n, recipient_phone: p };
}

/** How to keep the vegetables fresh, from the produce categories in a box ("rau_la", "cu_qua"). */
export function storageTips(categories: (string | null | undefined)[]) {
  const has = (c: string) => categories.includes(c);
  const tips: { icon: string; title: string; text: string }[] = [];
  if (has("rau_la")) tips.push({ icon: "ac_unit", title: "Rau lá", text: "Để ráo, không rửa trước; bọc giấy hoặc túi kín rồi cất ngăn mát tủ lạnh 3–5°C. Nên ăn trong 3–4 ngày đầu." });
  if (has("cu_qua")) tips.push({ icon: "air", title: "Củ quả", text: "Để nơi khô ráo, thoáng mát, tránh nắng; không cần tủ lạnh. Dùng dần tới cuối tuần." });
  if (!tips.length) return tips;
  tips.push({ icon: "lightbulb", title: "Mẹo nhỏ", text: "Nhận hộp là mở ra cho thoáng, nhặt bỏ lá dập. Chỉ rửa ngay trước khi nấu; cà chua và khoai tây để riêng, không cất chung với rau lá." });
  return tips;
}

/** Follows from gender by default (farmers: bác / cô, and bác when not given; customers: anh / chị, and bạn when not given). These are offered when choosing by hand; anything else is typed. */
export const FARMER_SALUTATIONS = ["bác", "cô", "chú"];
export const CUSTOMER_SALUTATIONS = ["anh", "chị", "bạn"];
/** Forms of address the platform understands at the start of a name. */
export const SALUTATIONS = ["bác", "cô", "chú", "u", "anh", "chị", "ông", "bà", "dì", "cậu", "mế", "thím", "mợ", "bá", "cụ", "em", "bạn"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * How to address someone, from the form of address on file ("bác Ba", see `callName`) or, failing
 * that, from their full name. `fallback` is used when the name carries no form of address:
 * farmers are "bác", customers "bạn".
 *   "bác Ba" / "Bác Ba Nguyễn" → { call: "Bác Ba", pronoun: "bác" }
 *   "Nguyễn Thị Lan" (customer) → { call: "Bạn Lan", pronoun: "bạn" }
 */
export function addressPerson(name: string, fallback = "bạn") {
  // From the database: "cô<nbsp>Tư". Whatever form of address the person chose is used as is.
  const [chosen, given] = name.split("\u00A0");
  if (given?.trim() && chosen.trim()) return { call: `${cap(chosen.trim().toLowerCase())} ${given.trim()}`, pronoun: chosen.trim().toLowerCase() };
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const title = (parts[0] ?? "").toLowerCase();
  if (SALUTATIONS.includes(title) && parts[1]) return { call: `${cap(title)} ${parts[1]}`, pronoun: title };
  // Vietnamese given names come last.
  return { call: `${cap(fallback)} ${parts[parts.length - 1] ?? ""}`.trim(), pronoun: fallback };
}
export const addressFarmer = (name: string) => addressPerson(name, "bác");

/** "15 kg cà rốt và 20 kg bắp cải" */
export function joinItems(items: { name: string; kg: number }[]) {
  const parts = items.map((i) => `${formatKg(i.kg)} ${i.name.toLowerCase()}`);
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} và ${parts[parts.length - 1]}`;
}
export const formatKg = (kg: number) => `${Number(kg.toFixed(1)).toLocaleString("vi-VN")} kg`;

/** The one message a farmer sees. */
export function commandMessage(farmerName: string, deliveryDate: string, items: { name: string; kg: number }[]) {
  const { call, pronoun } = addressFarmer(farmerName);
  return `${call} ơi, ${HARVEST_TIME.replace(":00", "h")} sáng ${formatYMD(deliveryDate, { day: "numeric", month: "numeric" })} nhờ ${pronoun} cắt giúp đúng ${joinItems(items)} ạ. Xe tải lạnh sẽ qua lấy lúc ${PICKUP_TIME.replace(":00", "h")}. Cảm ơn ${pronoun} nhiều ạ!`;
}

/** "Lời nhắn quan tâm": a note from home that comes with every box. */
export const CARE_MESSAGES = [
  "Trời trở gió rồi, nhớ nấu bát canh nóng mà ăn nghe con.",
  "Rau mẹ chọn toàn thứ non, về nhớ ăn trong tuần cho ngọt.",
  "Đi làm về mệt thì luộc rổ rau, đập quả trứng là xong bữa, đừng bỏ bữa nhé.",
  "Ở phố ăn uống thất thường, có hộp rau quê này cho ấm bụng.",
  "Cà rốt, bí đỏ hầm mềm cho sáng mắt, thức khuya ít thôi con ạ.",
  "Rau cắt lúc sương còn đọng, về tới nơi vẫn còn mùi đất đồi.",
  "Nhà mình mùa này rau tốt lắm, gửi xuống cho con ăn lấy thảo.",
  "Ăn rau nhiều vào cho mát người, nhớ uống đủ nước nữa.",
];
export const careMessageFor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CARE_MESSAGES[h % CARE_MESSAGES.length];
};
export const CARE_MESSAGE_MAX = 300;
/** The buyer's own note when they wrote one, otherwise one from the list. */
export const careMessageOr = (custom: unknown, seed: string) =>
  (typeof custom === "string" ? custom.trim().slice(0, CARE_MESSAGE_MAX) : "") || careMessageFor(seed);

/** Friendly facts shown right after ordering. `toFarmers` is what the farms are paid at the garden for these boxes. */
export function impactFor(size: string, quantity: number, weightKg: number, servings: number, days: number) {
  return { toFarmers: farmPayoutFor(size, quantity), toVillage: (VILLAGE_ALLOWANCE[size] ?? 0) * quantity, weightKg, meals: days * 2, servings };
}
