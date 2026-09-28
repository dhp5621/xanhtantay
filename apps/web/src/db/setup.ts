/**
 * Creates the database schema with plain SQL (drizzle-kit push misplans on Neon PG18).
 *   pnpm --filter web db:setup            create anything missing
 *   pnpm --filter web db:setup -- --drop  DROP every app table and type first (destroys data)
 * Keep in sync with src/db/schema.ts.
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "node:fs";

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    const line = readFileSync(f, "utf8").split("\n").find((l) => l.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("DATABASE_URL not set");
}

const DROP = [
  // pre-pivot tables
  "user_recipes", "meal_plans", "recipes", "order_items", "farm_diary", "products", "group_order_members",
  // current tables (children first)
  "harvest_commands", "orders", "harvest_runs", "group_orders", "subscriptions", "box_items", "boxes", "farm_capacity", "produce", "farms", "push_devices", "broadcasts", "change_requests", "users", "clusters",
];
const DROP_TYPES = ["order_status", "order_type", "subscription_frequency", "group_order_status", "run_status", "command_status", "user_role", "fulfillment"];

const CREATE = [
  `DO $$ BEGIN CREATE TYPE user_role AS ENUM ('customer','farmer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE order_status AS ENUM ('placed','harvesting','loaded','delivered','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE order_type AS ENUM ('single','subscription','group'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE subscription_frequency AS ENUM ('weekly','biweekly','monthly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE group_order_status AS ENUM ('open','locked','delivered','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE run_status AS ENUM ('allocated','harvesting','loaded','delivered'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE command_status AS ENUM ('sent','confirmed','declined'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS clusters (id text PRIMARY KEY, name text NOT NULL, address text NOT NULL, district text NOT NULL, created_at timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, name text NOT NULL, phone text, email text UNIQUE, role user_role NOT NULL DEFAULT 'customer', avatar_url text, password_hash text, cluster_id text REFERENCES clusters(id) ON DELETE SET NULL, address text, salutation text, short_name text, created_at timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS farms (id text PRIMARY KEY, owner_id text NOT NULL REFERENCES users(id), name text NOT NULL, location text NOT NULL, province text NOT NULL, description text, cover_url text, slug text NOT NULL UNIQUE, created_at timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS produce (id text PRIMARY KEY, name text NOT NULL, unit text NOT NULL DEFAULT 'kg', category text NOT NULL, image_url text, created_at timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS farm_capacity (id text PRIMARY KEY, farm_id text NOT NULL REFERENCES farms(id) ON DELETE CASCADE, produce_id text NOT NULL REFERENCES produce(id) ON DELETE CASCADE, daily_kg integer NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS farm_capacity_farm_produce ON farm_capacity(farm_id, produce_id)`,
  `CREATE TABLE IF NOT EXISTS boxes (id text PRIMARY KEY, slug text NOT NULL UNIQUE, name text NOT NULL, mix text NOT NULL DEFAULT 'me-gui', mix_name text NOT NULL DEFAULT 'Thùng rau mẹ gửi', size text NOT NULL, weight_kg numeric NOT NULL, price integer NOT NULL, season text NOT NULL, servings integer NOT NULL, days integer NOT NULL, description text, image_url text, meal_plan jsonb NOT NULL DEFAULT '[]', active boolean NOT NULL DEFAULT true, created_at timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS box_items (id text PRIMARY KEY, box_id text NOT NULL REFERENCES boxes(id) ON DELETE CASCADE, produce_id text NOT NULL REFERENCES produce(id), quantity_kg numeric NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS subscriptions (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), box_id text NOT NULL REFERENCES boxes(id), quantity integer NOT NULL DEFAULT 1, frequency subscription_frequency NOT NULL DEFAULT 'weekly', next_delivery date NOT NULL, cluster_id text REFERENCES clusters(id) ON DELETE SET NULL, address text, active boolean NOT NULL DEFAULT true, created_at timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS group_orders (id text PRIMARY KEY, cluster_id text NOT NULL REFERENCES clusters(id), box_id text NOT NULL REFERENCES boxes(id), title text NOT NULL, min_members integer NOT NULL, current_members integer NOT NULL DEFAULT 0, delivery_date date NOT NULL, status group_order_status NOT NULL DEFAULT 'open', created_by text REFERENCES users(id) ON DELETE SET NULL, created_at timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS harvest_runs (id text PRIMARY KEY, delivery_date date NOT NULL UNIQUE, status run_status NOT NULL DEFAULT 'allocated', demand jsonb NOT NULL DEFAULT '[]', total_kg numeric NOT NULL DEFAULT 0, total_orders integer NOT NULL DEFAULT 0, total_boxes integer NOT NULL DEFAULT 0, shortage_kg numeric NOT NULL DEFAULT 0, summary text, cutoff_at timestamp NOT NULL DEFAULT now(), harvested_at timestamp, loaded_at timestamp, delivered_at timestamp)`,
  `CREATE TABLE IF NOT EXISTS harvest_commands (id text PRIMARY KEY, run_id text NOT NULL REFERENCES harvest_runs(id) ON DELETE CASCADE, farm_id text NOT NULL REFERENCES farms(id), items jsonb NOT NULL DEFAULT '[]', total_kg numeric NOT NULL DEFAULT 0, message text NOT NULL, status command_status NOT NULL DEFAULT 'sent', confirmed_at timestamp, declined_at timestamp, created_at timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS orders (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), box_id text NOT NULL REFERENCES boxes(id), quantity integer NOT NULL DEFAULT 1, type order_type NOT NULL DEFAULT 'single', status order_status NOT NULL DEFAULT 'placed', subtotal integer NOT NULL, ship_fee integer NOT NULL DEFAULT 0, total integer NOT NULL, note text, meal_plan jsonb, care_message text, cluster_id text REFERENCES clusters(id) ON DELETE SET NULL, address text, delivery_date date NOT NULL, group_order_id text REFERENCES group_orders(id) ON DELETE SET NULL, subscription_id text REFERENCES subscriptions(id) ON DELETE SET NULL, run_id text REFERENCES harvest_runs(id) ON DELETE SET NULL, harvested_at timestamp, loaded_at timestamp, delivered_at timestamp, created_at timestamp NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS orders_delivery_idx ON orders(delivery_date, status)`,
  `CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS push_devices (id text PRIMARY KEY, platform text NOT NULL, token text NOT NULL UNIQUE, subscription jsonb, user_id text REFERENCES users(id) ON DELETE SET NULL, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS broadcasts (id text PRIMARY KEY, title text NOT NULL, body text NOT NULL, url text, target text NOT NULL DEFAULT 'all', category text, data jsonb, created_at timestamp NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS change_requests (id text PRIMARY KEY, farm_id text NOT NULL REFERENCES farms(id) ON DELETE CASCADE, kind text NOT NULL, payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending', note text, created_at timestamp NOT NULL DEFAULT now(), reviewed_at timestamp)`,
  // Columns added after the first release: existing databases are upgraded in place.
  `ALTER TYPE command_status ADD VALUE IF NOT EXISTS 'declined'`,
  `ALTER TABLE harvest_commands ADD COLUMN IF NOT EXISTS declined_at timestamp`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS meal_plan jsonb`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS salutation text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS short_name text`,
  `ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS category text`,
  `ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS data jsonb`,
  `ALTER TABLE boxes ADD COLUMN IF NOT EXISTS mix text NOT NULL DEFAULT 'me-gui'`,
  `ALTER TABLE boxes ADD COLUMN IF NOT EXISTS mix_name text NOT NULL DEFAULT 'Thùng rau mẹ gửi'`,
];

async function main() {
  const sql = neon(databaseUrl());
  if (process.argv.includes("--drop")) {
    console.log("Dropping all application tables…");
    for (const t of DROP) await sql(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    for (const t of DROP_TYPES) await sql(`DROP TYPE IF EXISTS "${t}" CASCADE`);
  }
  for (const stmt of CREATE) await sql(stmt);
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1`;
  console.log("Schema ready:", tables.map((t) => t.table_name).join(", "));
}
main().then(() => process.exit(0)).catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
