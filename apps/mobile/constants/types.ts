import type { Box, BoxMeal, BoxMealDay, Cluster, Farm, FarmCapacity, GroupOrder, HarvestCommand, Order, OrderStatus, OrderType, User } from "@xanhtantay/types";

/** JSON shapes returned by the API on top of the shared types (see docs/API.md). */

export interface BoxesResponse {
  boxes: Box[];
  delivery_date: string;
  cutoff_at: string;
  ship_fee: number;
}

/** A farmer's change waiting for the operator: nothing is in force until it is approved. */
export interface PendingRequest<P> {
  id: string;
  payload: P;
  created_at: string;
}
/** The last request was turned down recently and nothing is pending. */
export interface RejectedRequest {
  note: string | null;
  reviewed_at: string;
}
export interface FarmChange {
  name?: string;
  location?: string;
  province?: string;
  description?: string | null;
}
export interface CapacityChangeItem {
  produce_id: string;
  name: string;
  from_kg: number;
  to_kg: number;
}

/** `GET /farms`, `GET /farms/{id-or-slug}`, `GET /farms/mine` (only the last one has `pending` / `rejected`). */
export type FarmProfile = Farm & {
  farmer?: string | null;
  farmer_avatar?: string | null;
  grows?: FarmCapacity[];
  pending?: PendingRequest<FarmChange> | null;
  rejected?: RejectedRequest | null;
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
  box: (Pick<Box, "id" | "slug" | "name" | "size" | "weight_kg" | "image_url" | "days" | "servings"> & { meal_plan: BoxMealDay[]; customised?: boolean }) | null;
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

/** `GET /users/me`. `salutation` ("bác", "chị"…) and `short_name` ("Ba", "Lan") say how the person is addressed. */
export type Me = User & { cluster?: Cluster | null; salutation?: string | null; short_name?: string | null };

/** `POST /farmer/commands/{id}/confirm|decline`: the command, and the server's words to show after the answer. */
export type CommandAnswer = HarvestCommand & { notice?: { title: string; body: string } | null };

export interface FarmerCommands {
  farm: { id: string; name: string; location: string } | null;
  current: HarvestCommand | null;
  commands: HarvestCommand[];
}

/**
 * `GET /farmer/capacity`, and `PUT` / `DELETE` which file / withdraw a request: every produce on the
 * platform. `daily_kg` is what is in force (0 = not supplied); `pending_kg` is what was asked for.
 */
export interface FarmerCapacityItem {
  produce_id: string;
  name: string;
  category: string;
  image_url: string | null;
  daily_kg: number;
  pending_kg?: number | null;
}
export type ProduceCategory = "rau_la" | "cu_qua";
/** A produce the farm asked to add to the list: waiting, or decided in the last 7 days. */
export interface ProduceProposal {
  id: string;
  name: string;
  category: ProduceCategory;
  daily_kg: number;
  image_url: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  created_at: string;
}
/** `POST /farmer/produce` (202) and `DELETE /farmer/produce/{id}`. */
export interface ProduceProposals {
  proposals: ProduceProposal[];
}
export interface FarmerCapacity {
  farm: { id: string; name: string; location: string; slug: string };
  items: FarmerCapacityItem[];
  total_kg: number;
  pending?: PendingRequest<CapacityChangeItem[]> | null;
  rejected?: RejectedRequest | null;
  proposals?: ProduceProposal[];
}

/** Where a changed menu belongs: saved on an order, or only on screen for a box not bought yet. */
export type MenuTarget = { orderId: string } | { box: string };

/** `POST /menu`. */
export interface MenuResponse {
  plan: BoxMealDay[];
  meal?: BoxMeal;
  customised: boolean;
  ai: boolean;
}
