import type { Box, BoxSize, OrderType, SubscriptionFrequency } from "@xanhtantay/types";
import type { RefundMethod, RefundReason, RefundStatus } from "./types";

/** Display-only rules of the pre-order model (the server enforces the real ones). */

/** Boxes are delivered on Wednesdays and Sundays only; the book for a delivery day closes at 18:00 the day before. */
export const CUTOFF_LABEL = "18h00";
/** `Date#getDay()` of the delivery days: Wednesday (3) and Sunday (0). */
export const DELIVERY_WEEKDAYS = [3, 0];
export const DELIVERY_DAYS_LABEL = "thứ Tư và Chủ nhật";

/** Delivery fee per box, by size. One-off orders and subscriptions pay it; a group that reaches its minimum ships free. */
export const SHIP_FEES: Record<string, number> = { S: 15_000, M: 20_000, L: 30_000 };
/** Fee for `quantity` boxes of one size. `fees` is the table from `GET /boxes` (`ship_fees`) when it is known. */
export function shipFeeFor(size: string, quantity = 1, fees?: Record<string, number> | null) {
  const table = fees ?? SHIP_FEES;
  return (table[size] ?? SHIP_FEES[size] ?? SHIP_FEES.M) * quantity;
}

/** Paid to the farms at the garden for each box, by size: the "tiền về tay nông hộ" figure the server reports. */
export const FARM_PAYOUT: Record<string, number> = { S: 65_000, M: 112_000, L: 185_000 };
/** How farms are paid, shown with every harvest command. */
export const PAYOUT_RULE = "Thanh toán: 50% khi chuyến hàng được xác nhận, 50% còn lại trong 48 giờ sau khi giao xong.";

export const PAYMENT_METHOD_LABELS: Record<string, string> = { transfer: "Chuyển khoản trước", cod: "Trả khi nhận hàng" };
export const PAYMENT_STATUS_LABELS: Record<string, string> = { pending: "Chưa thanh toán", paid: "Đã thanh toán" };

/** "YYYY-MM-DD" is a delivery day (Wednesday or Sunday). */
export function isDeliveryDay(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return DELIVERY_WEEKDAYS.includes(new Date(y, m - 1, d).getDay());
}

/**
 * A subscription's next box may be moved to another delivery day until 24 hours before its cut-off
 * (18:00 Vietnam time the day before = 11:00 UTC). The server enforces the same rule.
 */
export function canMoveDelivery(nextDelivery: string, now: number = Date.now()) {
  const [y, m, d] = nextDelivery.split("-").map(Number);
  if (!y || !m || !d) return false;
  return now < Date.UTC(y, m - 1, d - 1, 11, 0, 0) - 24 * 3_600_000;
}

/** How to keep the vegetables fresh, from the produce categories in a box ("rau_la", "cu_qua"). */
export function storageTips(categories: (string | null | undefined)[]) {
  const has = (c: string) => categories.includes(c);
  const tips: { icon: string; title: string; text: string }[] = [];
  if (has("rau_la")) tips.push({ icon: "eco", title: "Rau lá", text: "Để ráo, không rửa trước; bọc giấy hoặc túi kín rồi cất ngăn mát tủ lạnh 3–5°C. Nên ăn trong 3–4 ngày đầu." });
  if (has("cu_qua")) tips.push({ icon: "nutrition", title: "Củ quả", text: "Để nơi khô ráo, thoáng mát, tránh nắng; không cần tủ lạnh. Dùng dần tới cuối tuần." });
  if (!tips.length) return tips;
  tips.push({ icon: "lightbulb", title: "Mẹo nhỏ", text: "Nhận hộp là mở ra cho thoáng, nhặt bỏ lá dập. Chỉ rửa ngay trước khi nấu; cà chua và khoai tây để riêng, không cất chung với rau lá." });
  return tips;
}

export const MAX_BOX_QUANTITY = 20;
export const GROUP_MIN_MEMBERS = { min: 2, max: 50, default: 5 } as const;

export type OrderMode = OrderType;

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  single: "Đơn lẻ",
  subscription: "Định kỳ",
  group: "Gom đơn",
};

export const ORDER_TYPE_ICONS: Record<OrderType, string> = {
  single: "shopping_bag",
  subscription: "event_repeat",
  group: "groups",
};

export const ORDER_MODES: { mode: OrderMode; label: string; icon: string; hint: string }[] = [
  { mode: "single", label: "Mua một lần", icon: "shopping_bag", hint: "Giao thứ Tư và Chủ nhật, đặt trước 18h00 hôm trước. Phí giao theo size: S 15.000₫, M 20.000₫, L 30.000₫ mỗi hộp." },
  { mode: "subscription", label: "Gói định kỳ", icon: "event_repeat", hint: "Tự lên đơn mỗi kỳ, trả trước bằng chuyển khoản. Tạm dừng hay dời ngày giao trước giờ chốt sổ 24 giờ." },
  { mode: "group", label: "Gom đơn cùng khu", icon: "groups", hint: "Rủ bạn cùng phòng, cùng ký túc xá hay khu trọ đặt chung. Đủ người lúc chốt sổ là cả nhóm miễn phí giao." },
];

export const FREQUENCIES: SubscriptionFrequency[] = ["weekly", "biweekly", "monthly"];

export const FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
  weekly: "Mỗi tuần",
  biweekly: "Hai tuần một lần",
  monthly: "Mỗi tháng",
};

export const FREQUENCY_ICONS: Record<SubscriptionFrequency, string> = {
  weekly: "date_range",
  biweekly: "event_repeat",
  monthly: "calendar_month",
};

export const SIZE_LABELS: Record<BoxSize, string> = {
  S: "Size S",
  M: "Size M",
  L: "Size L",
};

/** One mix of vegetables with its sizes; every size is its own box. */
export interface Mix {
  mix: string;
  name: string;
  season: string;
  image_url: string | null;
  items: Box["items"];
  sizes: Box[];
}

/** Older responses have no `mix`; such a box stands as a mix of its own. */
const mixKey = (b: Pick<Box, "mix" | "slug">) => b.mix || b.slug;

/** One entry per mix, each with its sizes from small to large. "Thùng rau mẹ gửi" leads. */
export function groupMixes(list: Box[]): Mix[] {
  const out = new Map<string, Mix>();
  for (const b of list) {
    const key = mixKey(b);
    const m = out.get(key) ?? { mix: key, name: b.mix_name || b.name, season: b.season, image_url: b.image_url, items: b.items ?? [], sizes: [] };
    m.sizes.push(b);
    out.set(key, m);
  }
  const mixes = [...out.values()];
  mixes.forEach((m) => m.sizes.sort((a, c) => Number(a.weight_kg) - Number(c.weight_kg)));
  return mixes.sort((a, c) => Number(c.mix === "me-gui") - Number(a.mix === "me-gui") || a.name.localeCompare(c.name, "vi"));
}

/** The sizes of the mix `box` belongs to (itself included), small to large. */
export function sizesOf(box: Box, list: Box[]): Box[] {
  return list.filter((b) => b.active !== false && mixKey(b) === mixKey(box)).sort((a, c) => Number(a.weight_kg) - Number(c.weight_kg));
}

/** The size a mix card opens when its photo or title is tapped. */
export const mainSize = (sizes: Box[]) => sizes.find((b) => b.size === "M") ?? sizes[0];


/** Return / refund after delivery (the server enforces the same rules). */
export const REFUND_REASONS: { value: RefundReason; label: string; icon: string }[] = [
  { value: "not_received", label: "Chưa nhận được hàng", icon: "inventory_2" },
  { value: "missing", label: "Thiếu hàng", icon: "scale" },
  { value: "spoiled", label: "Hàng bị hư hỏng", icon: "eco" },
  { value: "wrong", label: "Giao sai hàng", icon: "swap_horiz" },
  { value: "broken", label: "Giao hàng bị vỡ, hỏng hàng", icon: "warning" },
];
export const REFUND_METHODS: { value: RefundMethod; label: string; hint: string; icon: string }[] = [
  { value: "refund", label: "Hoàn tiền", hint: "Nhận lại tiền hộp rau", icon: "payments" },
  { value: "replace", label: "Giao bù hộp khác", hint: "Nhận hộp mới ở chuyến kế tiếp", icon: "local_shipping" },
];
export const REFUND_STATUS: Record<RefundStatus, { label: string; icon: string }> = {
  pending: { label: "Đang xác minh", icon: "hourglass_empty" },
  approved: { label: "Đã chấp nhận", icon: "check_circle" },
  rejected: { label: "Không chấp nhận", icon: "cancel" },
};
/** One photo per side of the box, in the order they are sent. */
export const REFUND_PHOTO_SLOTS = ["Mặt trước", "Mặt sau", "Bên trong", "Chỗ có vấn đề"] as const;
export const REFUND_PHOTOS = REFUND_PHOTO_SLOTS.length;
export const REFUND_VIDEO_SECONDS = 60;
export const REFUND_MIN_WORDS = 3;
export const REFUND_MAX_WORDS = 200;
/** What `POST /upload` accepts for evidence. */
export const REFUND_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const REFUND_VIDEO_MAX_BYTES = 30 * 1024 * 1024;
/** A box that never arrived cannot be photographed: evidence is optional for that reason only. */
export const evidenceRequired = (reason: RefundReason | null) => reason !== "not_received";
export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export const refundReasonLabel = (v: string) => REFUND_REASONS.find((r) => r.value === v)?.label ?? v;
export const refundMethodLabel = (v: string | null | undefined) => REFUND_METHODS.find((m) => m.value === v)?.label ?? "";
