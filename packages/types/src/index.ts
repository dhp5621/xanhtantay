/** Shared between apps/web and apps/mobile. Mirrors the JSON returned by the web API. */
export type UserRole = "customer" | "farmer";

export interface User {
  id: string; name: string; phone: string | null; email: string | null; role: UserRole;
  avatar_url: string | null; cluster_id: string | null; address: string | null; created_at: string | Date;
}

export interface Cluster { id: string; name: string; address: string; district: string }

export interface Farm {
  id: string; owner_id: string; name: string; location: string; province: string;
  description: string | null; cover_url: string | null; slug: string; created_at: string | Date;
}

export interface Produce { id: string; name: string; unit: string; category: string; image_url: string | null }
export interface FarmCapacity { produce_id: string; name: string; image_url: string | null; daily_kg: number }

export interface BoxRecipe { minutes?: number; ingredients: string[]; steps: string[] }
export interface BoxMeal { time: "Trưa" | "Tối"; title: string; uses: string[]; note?: string; recipe: BoxRecipe }
export interface BoxMealDay { day: number; meals: BoxMeal[] }
export interface BoxItem { produce_id: string; name: string; image_url: string | null; quantity_kg: number; farms: { name: string; slug: string; province: string }[] }
export type BoxSize = "S" | "M" | "L";

export interface Box {
  id: string; slug: string; name: string; size: BoxSize; weight_kg: number; price: number; season: string;
  servings: number; days: number; description: string | null; image_url: string | null;
  meal_plan: BoxMealDay[]; items: BoxItem[]; active: boolean;
}

export type OrderStatus = "placed" | "harvesting" | "loaded" | "delivered" | "cancelled";
export type OrderType = "single" | "subscription" | "group";

export interface Order {
  id: string; user_id: string; box_id: string; quantity: number; type: OrderType; status: OrderStatus;
  subtotal: number; ship_fee: number; total: number; note: string | null; care_message: string | null;
  cluster_id: string | null; address: string | null; delivery_date: string;
  group_order_id: string | null; subscription_id: string | null; run_id: string | null;
  harvested_at: string | null; loaded_at: string | null; delivered_at: string | null; created_at: string | Date;
  /** joined */
  box?: Pick<Box, "id" | "slug" | "name" | "size" | "weight_kg" | "image_url" | "days" | "servings">;
  cluster?: Cluster | null;
}

export type SubscriptionFrequency = "weekly" | "biweekly" | "monthly";
export interface Subscription {
  id: string; user_id: string; box_id: string; quantity: number; frequency: SubscriptionFrequency;
  next_delivery: string; cluster_id: string | null; address: string | null; active: boolean;
  box?: Pick<Box, "id" | "slug" | "name" | "size" | "price" | "image_url">; cluster?: Cluster | null;
}

export interface GroupOrder {
  id: string; cluster_id: string; box_id: string; title: string; min_members: number; current_members: number;
  delivery_date: string; status: "open" | "locked" | "delivered" | "cancelled"; created_by: string | null;
  box?: Pick<Box, "id" | "slug" | "name" | "size" | "price" | "image_url">; cluster?: Cluster;
}

export interface CommandItem { produce_id: string; name: string; kg: number }
export interface HarvestCommand {
  id: string; run_id: string; farm_id: string; items: CommandItem[]; total_kg: number; message: string;
  status: "sent" | "confirmed"; confirmed_at: string | null; created_at: string; delivery_date: string;
}

/** Emotional tracking: the clock time is part of the message. */
export const ORDER_TIMELINE: { status: Exclude<OrderStatus, "cancelled">; time: string; icon: string; short: string; label: (farmer?: string) => string }[] = [
  { status: "placed", time: "18:00", icon: "inventory", short: "Đã nhận đơn", label: () => "Đơn đã vào sổ, 18h00 chốt và gửi lệnh về vườn" },
  { status: "harvesting", time: "4:00", icon: "agriculture", short: "Đang thu hoạch", label: (f) => `Rau đang được ${f ?? "bác nông dân"} thu hoạch` },
  { status: "loaded", time: "6:00", icon: "local_shipping", short: "Lên xe lạnh", label: () => "Hàng lên xe lạnh về phố" },
  { status: "delivered", time: "16:00", icon: "apartment", short: "Đã tới sảnh", label: () => "Rau quê đã có tại sảnh chung cư nhà bạn" },
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Đơn đã vào sổ, chờ chốt lúc 18h00",
  harvesting: "4h00: Rau đang được bác nông dân thu hoạch",
  loaded: "6h00: Hàng lên xe lạnh về phố",
  delivered: "16h00: Rau quê đã có tại sảnh chung cư nhà bạn",
  cancelled: "Đơn đã huỷ",
};

export function getOrderStatusLabel(status: OrderStatus, farmer?: string | null): string {
  if (status === "harvesting" && farmer) return `4h00: Rau đang được ${farmer} thu hoạch`;
  return ORDER_STATUS_LABELS[status];
}
