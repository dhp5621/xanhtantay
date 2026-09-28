import type { Box, BoxSize, OrderType, SubscriptionFrequency } from "@xanhtantay/types";
import type { RefundMethod, RefundReason, RefundStatus } from "./types";

/** Display-only rules of the pre-order model (the server enforces the real ones). */

/** The book closes at 18:00 every day; orders placed before it are delivered the next day. */
export const CUTOFF_LABEL = "18h00";

/** One-off orders pay this; subscriptions and groups that reach their minimum ship free. */
export const SHIP_FEE = 15_000;

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
  { mode: "single", label: "Mua một lần", icon: "shopping_bag", hint: "Đặt trước 18h00, chiều mai có rau ở sảnh. Phí giao 15.000₫." },
  { mode: "subscription", label: "Gói định kỳ", icon: "event_repeat", hint: "Tự lên đơn mỗi kỳ, miễn phí giao. Tạm dừng lúc nào cũng được." },
  { mode: "group", label: "Gom đơn cùng toà nhà", icon: "groups", hint: "Rủ hàng xóm đặt chung. Đủ người lúc chốt sổ là cả nhóm miễn phí giao." },
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

/** Ship fee shown before ordering. A group only becomes free once it reaches its minimum at cut-off. */
export function shipFeeFor(mode: OrderMode, opts?: { groupReached?: boolean; fee?: number }) {
  if (mode === "subscription") return 0;
  if (mode === "group" && opts?.groupReached) return 0;
  return opts?.fee ?? SHIP_FEE;
}

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
