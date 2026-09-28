/** Business rules shared by the order API, the brain and the UI. All clock logic is Vietnam time (UTC+7, no DST). */

export const CUTOFF_HOUR = 18;          // daily cut-off: 18:00
export const HARVEST_TIME = "4:00";     // farmers cut at 4 am
export const PICKUP_TIME = "6:00";      // cold truck picks up
export const ARRIVAL_TIME = "16:00";    // boxes reach the lobby
export const SHIP_FEE = 15_000;         // single orders; subscriptions and full groups ship free
export const FARMER_SHARE = 0.925;      // platform keeps 5–10 %, shown as the midpoint
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

/** Order before 18:00 → delivered tomorrow; after 18:00 → the day after. */
export function nextDeliveryDate(at: Date = new Date()) {
  const vn = vnClock(at);
  return addDays(toYMD(vn), vn.getUTCHours() < CUTOFF_HOUR ? 1 : 2);
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

export function shipFeeFor(type: "single" | "subscription" | "group") {
  return type === "subscription" ? 0 : SHIP_FEE;
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

/** Friendly facts shown right after ordering. */
export function impactFor(subtotal: number, weightKg: number, servings: number, days: number) {
  return { toFarmers: Math.round(subtotal * FARMER_SHARE), weightKg, meals: days * 2, servings };
}
