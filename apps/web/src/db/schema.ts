import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["customer", "farmer"]);
export const orderStatusEnum = pgEnum("order_status", ["harvesting", "loaded", "delivered"]);
export const orderTypeEnum = pgEnum("order_type", ["single", "subscription", "group"]);
export const subscriptionFrequencyEnum = pgEnum("subscription_frequency", ["weekly", "monthly"]);
export const groupOrderStatusEnum = pgEnum("group_order_status", ["open", "locked", "delivered", "cancelled"]);

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email").unique(),
  role: userRoleEnum("role").notNull().default("customer"),
  avatar_url: text("avatar_url"),
  password_hash: text("password_hash"),
  /** Kitchen assistant preferences: goal, diet tags, servings, notes. */
  recipe_prefs: jsonb("recipe_prefs").$type<RecipePrefs>(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type RecipeGoal = "normal" | "diet" | "gym";
export interface RecipePrefs { goal: RecipeGoal; tags: string[]; servings: number; notes?: string; customDiet?: string }

export const farms = pgTable("farms", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  owner_id: text("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  cover_url: text("cover_url"),
  slug: text("slug").unique().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  farm_id: text("farm_id").notNull().references(() => farms.id),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  price_per_unit: integer("price_per_unit").notNull(),
  category: text("category").notNull(),
  image_url: text("image_url"),
  in_stock: boolean("in_stock").notNull().default(true),
  /** Units available for sale; decremented on every order, 0 ⇒ sold out. */
  stock_qty: integer("stock_qty").notNull().default(20),
});

export const farm_diary = pgTable("farm_diary", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  farm_id: text("farm_id").notNull().references(() => farms.id),
  content: text("content").notNull(),
  media_urls: text("media_urls").array().notNull().default([]),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text("user_id").notNull().references(() => users.id),
  farm_id: text("farm_id").notNull().references(() => farms.id),
  status: orderStatusEnum("status").notNull().default("harvesting"),
  type: orderTypeEnum("type").notNull().default("single"),
  total: integer("total").notNull(),
  note: text("note"),
  /** "direct": ships on its own; "pooled": below the minimum, combined with neighbours' orders. */
  delivery_mode: text("delivery_mode").notNull().default("direct"),
  /** Orders placed together from one multi-farm checkout share a batch id. */
  batch_id: text("batch_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const order_items = pgTable("order_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  order_id: text("order_id").notNull().references(() => orders.id),
  product_id: text("product_id").notNull().references(() => products.id),
  quantity: numeric("quantity").notNull(),
  unit_price: integer("unit_price").notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text("user_id").notNull().references(() => users.id),
  farm_id: text("farm_id").notNull().references(() => farms.id),
  frequency: subscriptionFrequencyEnum("frequency").notNull().default("weekly"),
  next_delivery: timestamp("next_delivery").notNull(),
  items: jsonb("items").$type<{ product_id: string; quantity: number }[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
});

export const group_orders = pgTable("group_orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  farm_id: text("farm_id").notNull().references(() => farms.id),
  title: text("title").notNull(),
  min_members: integer("min_members").notNull(),
  current_members: integer("current_members").notNull().default(0),
  deadline: timestamp("deadline").notNull(),
  status: groupOrderStatusEnum("status").notNull().default("open"),
  shipping_address: text("shipping_address").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const group_order_members = pgTable("group_order_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  group_order_id: text("group_order_id").notNull().references(() => group_orders.id),
  user_id: text("user_id").notNull().references(() => users.id),
  items: jsonb("items").$type<{ product_id: string; quantity: number }[]>().notNull().default([]),
});

/** AI-generated recipes, personal to each customer and based on what they actually bought. */
export const user_recipes = pgTable("user_recipes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text("user_id").notNull().references(() => users.id),
  order_id: text("order_id").references(() => orders.id),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: text("ingredients").array().notNull().default([]),
  steps: text("steps").array().notNull().default([]),
  /** Names of purchased products this recipe was built around. */
  based_on: text("based_on").array().notNull().default([]),
  source: text("source").notNull().default("ai"), // "ai" | "curated"
  minutes: integer("minutes"),
  kcal: integer("kcal"),
  protein_g: integer("protein_g"),
  /** Goal / diet tags the recipe was generated for, e.g. ["gym", "it_dau_mo"]. */
  tags: text("tags").array().notNull().default([]),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/** AI meal plan built from one delivered order: how many days the produce lasts and what to cook each day. */
export const meal_plans = pgTable("meal_plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text("user_id").notNull().references(() => users.id),
  order_id: text("order_id").notNull().references(() => orders.id),
  days: integer("days").notNull(),
  summary: text("summary"),
  plan: jsonb("plan").$type<MealPlanDay[]>().notNull().default([]),
  source: text("source").notNull().default("ai"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
export interface MealPlanMeal { time: string; title: string; uses: string[]; note?: string }
export interface MealPlanDay { day: number; meals: MealPlanMeal[]; leftover?: string }

/** Curated fallback recipes (used only when the AI service is not configured). */
export const recipes = pgTable("recipes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  ingredients: text("ingredients").array().notNull().default([]),
  steps: text("steps").array().notNull().default([]),
  image_url: text("image_url"),
});
