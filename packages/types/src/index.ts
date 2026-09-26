export type UserRole = "customer" | "farmer";

export interface User {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: Date;
}

export interface Farm {
  id: string;
  owner_id: string;
  name: string;
  location: string;
  description: string | null;
  cover_url: string | null;
  slug: string;
  created_at: Date;
}

export interface Product {
  id: string;
  farm_id: string;
  name: string;
  unit: string;
  price_per_unit: number;
  category: string;
  image_url: string | null;
  in_stock: boolean;
  stock_qty: number;
}

export interface FarmDiaryEntry {
  id: string;
  farm_id: string;
  content: string;
  media_urls: string[];
  created_at: Date;
}

export type OrderStatus = "harvesting" | "loaded" | "delivered";
export type OrderType = "single" | "subscription" | "group";

export interface Order {
  id: string;
  user_id: string;
  farm_id: string;
  status: OrderStatus;
  type: OrderType;
  total: number;
  note: string | null;
  created_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export type SubscriptionFrequency = "weekly" | "monthly";

export interface Subscription {
  id: string;
  user_id: string;
  farm_id: string;
  frequency: SubscriptionFrequency;
  next_delivery: Date;
  items: { product_id: string; quantity: number }[];
  active: boolean;
}

export interface GroupOrder {
  id: string;
  farm_id: string;
  title: string;
  min_members: number;
  current_members: number;
  deadline: Date;
  status: "open" | "locked" | "delivered" | "cancelled";
  shipping_address: string;
}

export interface GroupOrderMember {
  id: string;
  group_order_id: string;
  user_id: string;
  items: { product_id: string; quantity: number }[];
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  steps: string[];
  image_url: string | null;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  harvesting: "Rau đang được nhà vườn thu hoạch 🌿",
  loaded: "Hàng đã lên xe lạnh về phố 🚚",
  delivered: "Đồ quê đã đến tận cửa nhà bạn 🏡",
};

/** Dynamic label that includes the actual farmer/farm name */
export function getOrderStatusLabel(status: OrderStatus, farmerName?: string | null): string {
  if (status === "harvesting" && farmerName) {
    return `Rau đang được ${farmerName} thu hoạch 🌿`;
  }
  return ORDER_STATUS_LABELS[status];
}
