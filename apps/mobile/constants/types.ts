import type { Box, BoxMealDay, Cluster, Farm, FarmCapacity, GroupOrder, HarvestCommand, Order, OrderStatus, OrderType, User } from "@xanhtantay/types";

/** JSON shapes returned by the API on top of the shared types (see docs/API.md). */

export interface BoxesResponse {
  boxes: Box[];
  delivery_date: string;
  cutoff_at: string;
  ship_fee: number;
}

/** `GET /farms`, `GET /farms/{id-or-slug}`, `GET /farms/mine`. */
export type FarmProfile = Farm & {
  farmer?: string | null;
  farmer_avatar?: string | null;
  grows?: FarmCapacity[];
};

/** One farm's share of an order, as listed on `GET /orders`. */
export interface OrderFarmer {
  farm: string;
  slug: string;
  farmer: string | null;
  location: string;
  confirmed: boolean;
  items?: { produce_id?: string; name: string; kg: number }[];
}

export type MyOrder = Order & {
  allocated: boolean;
  farmers: OrderFarmer[];
};

export interface OrderImpact {
  toFarmers: number;
  weightKg: number;
  meals: number;
  servings: number;
}

/** `POST /orders` → 201. */
export type PlacedOrder = Order & { impact?: OrderImpact };

export interface TraceFarm {
  name: string;
  slug: string;
  location: string;
  farmer: string | null;
  confirmed?: boolean;
}

export interface TraceContent {
  name: string;
  image_url: string | null;
  quantity_kg: number;
  farms: { name: string; slug: string; location?: string; farmer?: string | null }[];
}

/** `GET /orders/{id}` — the public trace; the private fields only come back when `mine`. */
export interface OrderTrace {
  id: string;
  status: OrderStatus;
  type: OrderType;
  quantity: number;
  delivery_date: string;
  created_at: string;
  harvested_at: string | null;
  loaded_at: string | null;
  delivered_at: string | null;
  cutoff_at: string | null;
  allocated: boolean;
  cluster: { name: string; district: string } | null;
  box: (Pick<Box, "id" | "slug" | "name" | "size" | "weight_kg" | "image_url" | "days" | "servings"> & { meal_plan: BoxMealDay[] }) | null;
  contents: TraceContent[];
  farms: TraceFarm[];
  mine: boolean;
  total?: number;
  subtotal?: number;
  ship_fee?: number;
  note?: string | null;
  care_message?: string | null;
  address?: string | null;
  group_order_id?: string | null;
}

export interface GroupMember {
  id: string;
  name: string | null;
  avatar_url: string | null;
  quantity: number;
  me: boolean;
}

/** `GET /groups/{id}`. */
export type GroupDetail = GroupOrder & {
  cutoff_at: string;
  closed: boolean;
  joined: boolean;
  members: GroupMember[];
};

export interface Feed {
  delivery_date: string;
  cutoff_at: string;
  pilot: { city: string; provinces: string[] };
  boxes: Box[];
  farms: FarmProfile[];
  groups: GroupOrder[];
  my_cluster_id: string | null;
  live_order: MyOrder | null;
  stats: { farms: number; clusters: number; boxes_delivered: number };
}

/** `GET /users/me`. */
export type Me = User & { cluster?: Cluster | null };

export interface FarmerCommands {
  farm: { id: string; name: string; location: string } | null;
  current: HarvestCommand | null;
  commands: HarvestCommand[];
}
