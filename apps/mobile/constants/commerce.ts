import type { Box, BoxSize, OrderType, SubscriptionFrequency } from "@xanhtantay/types";

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
