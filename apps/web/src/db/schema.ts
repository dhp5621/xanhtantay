import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, pgEnum, date, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Xanh Tận Tay — PULL model (pivot 28/9):
 * customers pre-order seasonal BOXES → daily 18:00 cut-off → the brain aggregates demand and
 * splits it into harvest commands per farm by registered capacity → farmers confirm and cut exactly that.
 */

export const userRoleEnum = pgEnum("user_role", ["customer", "farmer"]);
/** placed: waiting for the 18:00 cut-off · harvesting: 04:00 · loaded: 06:00 · delivered: 16:00 at the lobby */
export const orderStatusEnum = pgEnum("order_status", ["placed", "harvesting", "loaded", "delivered", "cancelled"]);
export const orderTypeEnum = pgEnum("order_type", ["single", "subscription", "group"]);
export const subscriptionFrequencyEnum = pgEnum("subscription_frequency", ["weekly", "biweekly", "monthly"]);
export const groupOrderStatusEnum = pgEnum("group_order_status", ["open", "locked", "delivered", "cancelled"]);
export const runStatusEnum = pgEnum("run_status", ["allocated", "harvesting", "loaded", "delivered"]);
export const commandStatusEnum = pgEnum("command_status", ["sent", "confirmed"]);

/** Apartment clusters in Hà Nội: the unit of group buying and lobby delivery. */
export const clusters = pgTable("clusters", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  address: text("address").notNull(),
  district: text("district").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email").unique(),
  role: userRoleEnum("role").notNull().default("customer"),
  avatar_url: text("avatar_url"),
  password_hash: text("password_hash"),
  /** Customer's building and flat, prefilled at checkout. */
  cluster_id: text("cluster_id").references(() => clusters.id, { onDelete: "set null" }),
  address: text("address"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const farms = pgTable("farms", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  owner_id: text("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  /** "Ba Bể, Bắc Kạn" */
  location: text("location").notNull(),
  province: text("province").notNull(),
  description: text("description"),
  cover_url: text("cover_url"),
  slug: text("slug").unique().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/** Raw vegetables that go into boxes. Customers never buy these one by one. */
export const produce = pgTable("produce", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("kg"),
  category: text("category").notNull(),
  image_url: text("image_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/** What each farm registered it can harvest per day. The brain never commands more than this. */
export const farm_capacity = pgTable("farm_capacity", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  farm_id: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  produce_id: text("produce_id").notNull().references(() => produce.id, { onDelete: "cascade" }),
  daily_kg: integer("daily_kg").notNull(),
}, (t) => [uniqueIndex("farm_capacity_farm_produce").on(t.farm_id, t.produce_id)]);

export interface BoxRecipe { minutes?: number; ingredients: string[]; steps: string[] }
export interface BoxMeal { time: "Trưa" | "Tối"; title: string; uses: string[]; note?: string; recipe: BoxRecipe }
export interface BoxMealDay { day: number; meals: BoxMeal[] }

/** Seasonal box, mixed from several farms, sold in sizes. Comes with its own day-by-day menu. */
export const boxes = pgTable("boxes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  /** "S" | "M" | "L" */
  size: text("size").notNull(),
  weight_kg: numeric("weight_kg").notNull(),
  price: integer("price").notNull(),
  /** "Thu 2026" */
  season: text("season").notNull(),
  servings: integer("servings").notNull(),
  days: integer("days").notNull(),
  description: text("description"),
  image_url: text("image_url"),
  meal_plan: jsonb("meal_plan").$type<BoxMealDay[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const box_items = pgTable("box_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  box_id: text("box_id").notNull().references(() => boxes.id, { onDelete: "cascade" }),
  produce_id: text("produce_id").notNull().references(() => produce.id),
  quantity_kg: numeric("quantity_kg").notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text("user_id").notNull().references(() => users.id),
  box_id: text("box_id").notNull().references(() => boxes.id),
  quantity: integer("quantity").notNull().default(1),
  frequency: subscriptionFrequencyEnum("frequency").notNull().default("weekly"),
  next_delivery: date("next_delivery").notNull(),
  cluster_id: text("cluster_id").references(() => clusters.id, { onDelete: "set null" }),
  address: text("address"),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/** Neighbours of one cluster ordering the same box for the same day: enough members ⇒ free delivery. */
export const group_orders = pgTable("group_orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  cluster_id: text("cluster_id").notNull().references(() => clusters.id),
  box_id: text("box_id").notNull().references(() => boxes.id),
  title: text("title").notNull(),
  min_members: integer("min_members").notNull(),
  current_members: integer("current_members").notNull().default(0),
  delivery_date: date("delivery_date").notNull(),
  status: groupOrderStatusEnum("status").notNull().default("open"),
  created_by: text("created_by").references(() => users.id, { onDelete: "set null" }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const harvest_runs = pgTable("harvest_runs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  delivery_date: date("delivery_date").notNull().unique(),
  status: runStatusEnum("status").notNull().default("allocated"),
  /** Aggregated demand at cut-off. */
  demand: jsonb("demand").$type<{ produce_id: string; name: string; kg: number; allocated_kg: number }[]>().notNull().default([]),
  total_kg: numeric("total_kg").notNull().default("0"),
  total_orders: integer("total_orders").notNull().default(0),
  total_boxes: integer("total_boxes").notNull().default(0),
  /** Demand the registered capacity could not cover (should be 0). */
  shortage_kg: numeric("shortage_kg").notNull().default("0"),
  summary: text("summary"),
  cutoff_at: timestamp("cutoff_at").defaultNow().notNull(),
  harvested_at: timestamp("harvested_at"),
  loaded_at: timestamp("loaded_at"),
  delivered_at: timestamp("delivered_at"),
});

export interface CommandItem { produce_id: string; name: string; kg: number }

/** One message per farm per run: "cut exactly this much at 4 am". */
export const harvest_commands = pgTable("harvest_commands", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  run_id: text("run_id").notNull().references(() => harvest_runs.id, { onDelete: "cascade" }),
  farm_id: text("farm_id").notNull().references(() => farms.id),
  items: jsonb("items").$type<CommandItem[]>().notNull().default([]),
  total_kg: numeric("total_kg").notNull().default("0"),
  message: text("message").notNull(),
  status: commandStatusEnum("status").notNull().default("sent"),
  confirmed_at: timestamp("confirmed_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text("user_id").notNull().references(() => users.id),
  box_id: text("box_id").notNull().references(() => boxes.id),
  quantity: integer("quantity").notNull().default(1),
  type: orderTypeEnum("type").notNull().default("single"),
  status: orderStatusEnum("status").notNull().default("placed"),
  /** Box price × quantity. */
  subtotal: integer("subtotal").notNull(),
  ship_fee: integer("ship_fee").notNull().default(0),
  total: integer("total").notNull(),
  note: text("note"),
  /** "Lời nhắn quan tâm" shown to the customer with this order. */
  care_message: text("care_message"),
  cluster_id: text("cluster_id").references(() => clusters.id, { onDelete: "set null" }),
  address: text("address"),
  delivery_date: date("delivery_date").notNull(),
  group_order_id: text("group_order_id").references(() => group_orders.id, { onDelete: "set null" }),
  subscription_id: text("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  run_id: text("run_id").references(() => harvest_runs.id, { onDelete: "set null" }),
  harvested_at: timestamp("harvested_at"),
  loaded_at: timestamp("loaded_at"),
  delivered_at: timestamp("delivered_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Devices that accept push notifications. Phones register an Expo push token (`ExponentPushToken[…]`);
 * browsers register a Web Push subscription, keyed by its endpoint URL.
 */
export const push_devices = pgTable("push_devices", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  /** "ios" | "android" | "web" */
  platform: text("platform").notNull(),
  /** Expo push token, or the Web Push endpoint URL. */
  token: text("token").notNull().unique(),
  /** Web Push only: the full PushSubscription JSON (endpoint + keys). */
  subscription: jsonb("subscription").$type<WebPushSubscription>(),
  user_id: text("user_id").references(() => users.id, { onDelete: "set null" }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
export interface WebPushSubscription { endpoint: string; expirationTime?: number | null; keys: { p256dh: string; auth: string } }
