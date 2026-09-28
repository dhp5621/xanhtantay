/**
 * Demo data for the pilot: Hà Nội apartment clusters, farms in Bắc Kạn and Tuyên Quang, seasonal boxes.
 *   pnpm --filter web db:seed
 * Master data is upserted. Transactional demo data (orders, runs, groups, subscriptions) is REBUILT
 * relative to today, so re-seeding always gives a fresh, demo-ready state.
 */
import { readFileSync, existsSync } from "node:fs";
if (!process.env.DATABASE_URL) for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  const line = readFileSync(f, "utf8").split("\n").find((l) => l.startsWith("DATABASE_URL="));
  if (line) { process.env.DATABASE_URL = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, ""); break; }
}

const C = (f: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=640`;
const U = (p: string) => `https://images.unsplash.com/${p}?w=1000&q=70&auto=format`;

async function seed() {
  const { db } = await import("./index");
  const s = await import("./schema");
  const { MENU_S, MENU_M, MENU_L } = await import("./menu");
  const { addDays, todayVN, nextDeliveryDate, careMessageFor, vnInstant, SHIP_FEE } = await import("../lib/commerce");
  const { runCutoff, advanceRun } = await import("../lib/brain");
  const { sql } = await import("drizzle-orm");

  console.log("Seeding…");
  // Transactional data is rebuilt from scratch.
  await db.execute(sql`TRUNCATE harvest_commands, orders, harvest_runs, group_orders, subscriptions RESTART IDENTITY CASCADE`);

  await db.insert(s.clusters).values([
    { id: "cl-times-city", name: "Times City", address: "458 Minh Khai", district: "Hai Bà Trưng" },
    { id: "cl-royal-city", name: "Royal City", address: "72A Nguyễn Trãi", district: "Thanh Xuân" },
    { id: "cl-smart-city", name: "Vinhomes Smart City", address: "Đại lộ Thăng Long, Tây Mỗ", district: "Nam Từ Liêm" },
    { id: "cl-goldmark", name: "Goldmark City", address: "136 Hồ Tùng Mậu", district: "Bắc Từ Liêm" },
    { id: "cl-linh-dam", name: "HH Linh Đàm", address: "Khu đô thị Linh Đàm", district: "Hoàng Mai" },
  ]).onConflictDoNothing();

  const up = { password_hash: "$2b$10$example" };
  await db.insert(s.users).values([
    { id: "farmer-bac-ba", name: "Bác Ba Nguyễn", phone: "0901234567", email: "bacba@xanhtantay.vn", role: "farmer", ...up },
    { id: "farmer-co-tu", name: "Cô Tư Lê", phone: "0912345678", email: "cotu@xanhtantay.vn", role: "farmer", ...up },
    { id: "farmer-u-tham", name: "U Thắm Trần", phone: "0923456789", email: "utham@xanhtantay.vn", role: "farmer", ...up },
    { id: "farmer-bac-tu", name: "Bác Tư Hoàng", phone: "0967890123", email: "bactu@xanhtantay.vn", role: "farmer", ...up },
    { id: "customer-demo", name: "Nguyễn Thị Lan", phone: "0934567890", email: "lan@gmail.com", role: "customer", cluster_id: "cl-times-city", address: "T5 · căn 1208", ...up },
    { id: "customer-minh", name: "Trần Văn Minh", phone: "0945678901", email: "minh@gmail.com", role: "customer", cluster_id: "cl-times-city", address: "T8 · căn 0915", ...up },
    { id: "customer-hoa", name: "Lê Thị Hoa", phone: "0956789012", email: "hoa@gmail.com", role: "customer", cluster_id: "cl-royal-city", address: "R2 · căn 2104", ...up },
    { id: "customer-quan", name: "Phạm Anh Quân", phone: "0978901234", email: "quan@gmail.com", role: "customer", cluster_id: "cl-smart-city", address: "S2.05 · căn 1611", ...up },
    { id: "customer-mai", name: "Đỗ Thanh Mai", phone: "0989012345", email: "mai@gmail.com", role: "customer", cluster_id: "cl-times-city", address: "T2 · căn 0707", ...up },
    { id: "customer-son", name: "Vũ Hồng Sơn", phone: "0990123456", email: "son@gmail.com", role: "customer", cluster_id: "cl-goldmark", address: "Ruby 2 · căn 1803", ...up },
  ]).onConflictDoUpdate({ target: s.users.id, set: { cluster_id: sql`excluded.cluster_id`, address: sql`excluded.address`, name: sql`excluded.name`, phone: sql`excluded.phone` } });

  await db.insert(s.farms).values([
    { id: "farm-bac-ba", owner_id: "farmer-bac-ba", name: "Vườn nhà bác Ba", slug: "vuon-bac-ba", location: "Ba Bể, Bắc Kạn", province: "Bắc Kạn", cover_url: U("photo-1625246333195-78d9c38ad449"), description: "Nương rau trên triền đồi ven hồ Ba Bể. Bác Ba trồng củ quả theo lối cũ của người Tày: ủ phân chuồng, tưới nước suối, không thuốc trừ sâu." },
    { id: "farm-co-tu", owner_id: "farmer-co-tu", name: "Nương rau cô Tư", slug: "nuong-rau-co-tu", location: "Chợ Đồn, Bắc Kạn", province: "Bắc Kạn", cover_url: U("photo-1464226184884-fa280b87c399"), description: "Rau lá vùng cao: cải mèo, cải ngọt, ngọn su su. Sương sớm và đêm lạnh làm rau giòn và đậm vị hơn rau đồng bằng." },
    { id: "farm-u-tham", owner_id: "farmer-u-tham", name: "Vườn quê u Thắm", slug: "vuon-que-u-tham", location: "Sơn Dương, Tuyên Quang", province: "Tuyên Quang", cover_url: U("photo-1416879595882-3373a0480b5b"), description: "Vườn đồi ở Sơn Dương, chuyên bí đỏ, cà chua và bắp cải. U Thắm trồng theo vụ, mùa nào thức nấy." },
    { id: "farm-bac-tu", owner_id: "farmer-bac-tu", name: "Đồi rau bác Tư", slug: "doi-rau-bac-tu", location: "Na Hang, Tuyên Quang", province: "Tuyên Quang", cover_url: U("photo-1574943320219-553eb213f72d"), description: "Đồi rau bên lòng hồ Na Hang. Bác Tư là người cắt rau lúc 4 giờ sáng mà bạn thấy trong hành trình đơn hàng." },
  ]).onConflictDoUpdate({ target: s.farms.id, set: { name: sql`excluded.name`, slug: sql`excluded.slug`, location: sql`excluded.location`, province: sql`excluded.province`, description: sql`excluded.description`, cover_url: sql`excluded.cover_url` } });

  await db.insert(s.produce).values([
    { id: "pr-ca-rot", name: "Cà rốt", category: "cu_qua", image_url: C("Carrot at monday market.jpg") },
    { id: "pr-bap-cai", name: "Bắp cải", category: "rau_la", image_url: C("Fresh green cabbage heads.jpg") },
    { id: "pr-su-hao", name: "Su hào", category: "cu_qua", image_url: C("Brassica oleracea var. gongylodes (kohlrabi).jpg") },
    { id: "pr-cai-meo", name: "Cải mèo", category: "rau_la", image_url: C("Curly mustard leaves.jpg") },
    { id: "pr-cai-ngot", name: "Cải ngọt", category: "rau_la", image_url: C("Sawihijau3 Pj DSC 4883.jpg") },
    { id: "pr-bi-do", name: "Bí đỏ", category: "cu_qua", image_url: C("Cucurbita maxima kabocha USA orange variety.jpg") },
    { id: "pr-su-su", name: "Su su", category: "cu_qua", image_url: C("Chayote 1.jpg") },
    { id: "pr-khoai-tay", name: "Khoai tây", category: "cu_qua", image_url: C("Patates.jpg") },
    { id: "pr-ca-chua", name: "Cà chua", category: "cu_qua", image_url: C("Fresh red tomatoes.jpg") },
  ]).onConflictDoUpdate({ target: s.produce.id, set: { name: sql`excluded.name`, image_url: sql`excluded.image_url`, category: sql`excluded.category` } });

  const cap = (farm: string, list: [string, number][]) => list.map(([p, kg]) => ({ id: `cap-${farm}-${p}`, farm_id: `farm-${farm}`, produce_id: `pr-${p}`, daily_kg: kg }));
  await db.insert(s.farm_capacity).values([
    ...cap("bac-ba", [["ca-rot", 40], ["bap-cai", 60], ["su-hao", 30], ["khoai-tay", 40]]),
    ...cap("co-tu", [["cai-meo", 25], ["cai-ngot", 30], ["su-su", 40], ["ca-chua", 20]]),
    ...cap("u-tham", [["bi-do", 60], ["ca-chua", 30], ["bap-cai", 40], ["ca-rot", 25]]),
    ...cap("bac-tu", [["su-su", 30], ["cai-meo", 20], ["khoai-tay", 50], ["bi-do", 40], ["su-hao", 20]]),
  ]).onConflictDoUpdate({ target: s.farm_capacity.id, set: { daily_kg: sql`excluded.daily_kg` } });

  await db.insert(s.boxes).values([
    { id: "box-s", slug: "hop-nho", name: "Thùng rau mẹ gửi · Nhỏ", size: "S", weight_kg: "3", price: 119000, season: "Thu 2026", servings: 2, days: 3, image_url: C("Vegetable box 4.jpg"), meal_plan: MENU_S, description: "3 kg rau củ mùa thu cho nhà hai người, đủ nấu 3 ngày. Rau lá ăn trước, củ để sau." },
    { id: "box-m", slug: "hop-vua", name: "Thùng rau mẹ gửi · Vừa", size: "M", weight_kg: "5", price: 179000, season: "Thu 2026", servings: 4, days: 4, image_url: C("June 19th Organic Vegetable Box.jpg"), meal_plan: MENU_M, description: "5 kg cho gia đình 3–4 người, đủ 4 ngày. Có cả rau lá vùng cao và củ quả để hầm." },
    { id: "box-l", slug: "hop-lon", name: "Thùng rau mẹ gửi · Lớn", size: "L", weight_kg: "8", price: 269000, season: "Thu 2026", servings: 6, days: 5, image_url: C("Organic Vegetable Boxes - 3085908608.jpg"), meal_plan: MENU_L, description: "8 kg cho nhà đông người hoặc hai nhà chung nhau, đủ 5 ngày với 9 loại rau củ." },
  ]).onConflictDoUpdate({ target: s.boxes.id, set: { name: sql`excluded.name`, slug: sql`excluded.slug`, price: sql`excluded.price`, weight_kg: sql`excluded.weight_kg`, season: sql`excluded.season`, servings: sql`excluded.servings`, days: sql`excluded.days`, image_url: sql`excluded.image_url`, meal_plan: sql`excluded.meal_plan`, description: sql`excluded.description`, active: sql`true` } });

  await db.execute(sql`DELETE FROM box_items WHERE box_id IN ('box-s','box-m','box-l')`);
  const bi = (box: string, list: [string, number][]) => list.map(([p, kg]) => ({ id: `bi-${box}-${p}`, box_id: `box-${box}`, produce_id: `pr-${p}`, quantity_kg: String(kg) }));
  await db.insert(s.box_items).values([
    ...bi("s", [["bap-cai", 1], ["ca-rot", 0.5], ["su-su", 0.5], ["cai-ngot", 0.5], ["ca-chua", 0.5]]),
    ...bi("m", [["bap-cai", 1], ["ca-rot", 1], ["su-hao", 0.5], ["cai-meo", 0.5], ["bi-do", 1], ["ca-chua", 0.5], ["khoai-tay", 0.5]]),
    ...bi("l", [["bap-cai", 1.5], ["ca-rot", 1], ["su-hao", 1], ["cai-meo", 0.5], ["cai-ngot", 0.5], ["bi-do", 1.5], ["su-su", 0.5], ["khoai-tay", 1], ["ca-chua", 0.5]]),
  ]);

  // ── Demo activity, relative to today ───────────────────────────────────────
  const today = todayVN();
  const price = { "box-s": 119000, "box-m": 179000, "box-l": 269000 } as Record<string, number>;
  const who = { "customer-demo": ["cl-times-city", "T5 · căn 1208"], "customer-minh": ["cl-times-city", "T8 · căn 0915"], "customer-hoa": ["cl-royal-city", "R2 · căn 2104"], "customer-quan": ["cl-smart-city", "S2.05 · căn 1611"], "customer-mai": ["cl-times-city", "T2 · căn 0707"], "customer-son": ["cl-goldmark", "Ruby 2 · căn 1803"] } as Record<string, [string, string]>;
  const order = (id: string, user: string, box: string, qty: number, date: string, type: "single" | "subscription" | "group" = "single", extra: Partial<typeof s.orders.$inferInsert> = {}) => {
    const subtotal = price[box] * qty, ship = type === "single" ? SHIP_FEE : 0;
    return { id, user_id: user, box_id: box, quantity: qty, type, status: "placed" as const, subtotal, ship_fee: ship, total: subtotal + ship, cluster_id: who[user][0], address: who[user][1], delivery_date: date, care_message: careMessageFor(id), ...extra };
  };

  // Subscriptions
  await db.insert(s.subscriptions).values([
    { id: "sub-demo-1", user_id: "customer-demo", box_id: "box-m", quantity: 1, frequency: "weekly", next_delivery: addDays(today, -3), cluster_id: "cl-times-city", address: "T5 · căn 1208" },
    { id: "sub-hoa-1", user_id: "customer-hoa", box_id: "box-s", quantity: 1, frequency: "weekly", next_delivery: addDays(today, 1), cluster_id: "cl-royal-city", address: "R2 · căn 2104" },
    { id: "sub-son-1", user_id: "customer-son", box_id: "box-l", quantity: 1, frequency: "biweekly", next_delivery: addDays(today, 4), cluster_id: "cl-goldmark", address: "Ruby 2 · căn 1803" },
  ]);

  // Run A: delivered three days ago
  const dA = addDays(today, -3);
  await db.insert(s.orders).values([
    order("o-a1", "customer-minh", "box-s", 1, dA, "single", { created_at: vnInstant(addDays(dA, -1), "10:20") }),
    order("o-a2", "customer-quan", "box-l", 1, dA, "single", { created_at: vnInstant(addDays(dA, -1), "15:05") }),
  ]);
  const a = await runCutoff(dA); // also materialises Lan's subscription order for that day
  await db.execute(sql`UPDATE harvest_runs SET cutoff_at = ${vnInstant(addDays(dA, -1), "18:00").toISOString()} WHERE id = ${a.run_id}`);
  await db.execute(sql`UPDATE harvest_commands SET status = 'confirmed', confirmed_at = ${vnInstant(addDays(dA, -1), "18:40").toISOString()}, created_at = ${vnInstant(addDays(dA, -1), "18:00").toISOString()} WHERE run_id = ${a.run_id}`);
  for (let i = 0; i < 3; i++) await advanceRun(a.run_id);
  await db.execute(sql`UPDATE harvest_runs SET harvested_at = ${vnInstant(dA, "4:00").toISOString()}, loaded_at = ${vnInstant(dA, "6:00").toISOString()}, delivered_at = ${vnInstant(dA, "16:00").toISOString()} WHERE id = ${a.run_id}`);
  await db.execute(sql`UPDATE orders SET harvested_at = ${vnInstant(dA, "4:00").toISOString()}, loaded_at = ${vnInstant(dA, "6:00").toISOString()}, delivered_at = ${vnInstant(dA, "16:00").toISOString()} WHERE run_id = ${a.run_id}`);

  // Run B: today's delivery, already cut off yesterday, on the truck now
  const dB = today;
  await db.insert(s.orders).values([
    order("o-b1", "customer-demo", "box-s", 1, dB, "single", { created_at: vnInstant(addDays(dB, -1), "9:12"), note: "Gửi lễ tân giúp em" }),
    order("o-b2", "customer-mai", "box-m", 1, dB, "single", { created_at: vnInstant(addDays(dB, -1), "11:40") }),
    order("o-b3", "customer-son", "box-m", 2, dB, "single", { created_at: vnInstant(addDays(dB, -1), "16:30") }),
  ]);
  const b = await runCutoff(dB);
  await db.execute(sql`UPDATE harvest_runs SET cutoff_at = ${vnInstant(addDays(dB, -1), "18:00").toISOString()} WHERE id = ${b.run_id}`);
  await db.execute(sql`UPDATE harvest_commands SET status = 'confirmed', confirmed_at = ${vnInstant(addDays(dB, -1), "19:05").toISOString()}, created_at = ${vnInstant(addDays(dB, -1), "18:00").toISOString()} WHERE run_id = ${b.run_id}`);
  await advanceRun(b.run_id); await advanceRun(b.run_id);
  await db.execute(sql`UPDATE harvest_runs SET harvested_at = ${vnInstant(dB, "4:00").toISOString()}, loaded_at = ${vnInstant(dB, "6:00").toISOString()} WHERE id = ${b.run_id}`);
  await db.execute(sql`UPDATE orders SET harvested_at = ${vnInstant(dB, "4:00").toISOString()}, loaded_at = ${vnInstant(dB, "6:00").toISOString()} WHERE run_id = ${b.run_id}`);

  // Open book: pre-orders for the next delivery, waiting for the 18:00 cut-off (admin can close it live)
  const dC = nextDeliveryDate();
  await db.insert(s.group_orders).values([
    { id: "g-times", cluster_id: "cl-times-city", box_id: "box-m", title: "Hội rau sạch Times City T5–T8", min_members: 4, current_members: 3, delivery_date: dC, created_by: "customer-demo" },
    { id: "g-royal", cluster_id: "cl-royal-city", box_id: "box-s", title: "Mẹ bỉm Royal City", min_members: 3, current_members: 1, delivery_date: addDays(dC, 1), created_by: "customer-hoa" },
    { id: "g-smart", cluster_id: "cl-smart-city", box_id: "box-l", title: "Smart City S2 gom hộp lớn", min_members: 3, current_members: 1, delivery_date: addDays(dC, 2), created_by: "customer-quan" },
  ]);
  await db.insert(s.orders).values([
    order("o-c1", "customer-demo", "box-m", 1, dC, "group", { group_order_id: "g-times", ship_fee: SHIP_FEE, total: price["box-m"] + SHIP_FEE }),
    order("o-c2", "customer-minh", "box-m", 1, dC, "group", { group_order_id: "g-times", ship_fee: SHIP_FEE, total: price["box-m"] + SHIP_FEE }),
    order("o-c3", "customer-mai", "box-m", 2, dC, "group", { group_order_id: "g-times", ship_fee: SHIP_FEE, total: price["box-m"] * 2 + SHIP_FEE }),
    order("o-c4", "customer-quan", "box-l", 1, dC, "single"),
    order("o-c5", "customer-son", "box-s", 2, dC, "single"),
    order("o-c6", "customer-hoa", "box-s", 1, addDays(dC, 1), "group", { group_order_id: "g-royal", ship_fee: SHIP_FEE, total: price["box-s"] + SHIP_FEE }),
    order("o-c7", "customer-quan", "box-l", 1, addDays(dC, 2), "group", { group_order_id: "g-smart", ship_fee: SHIP_FEE, total: price["box-l"] + SHIP_FEE }),
  ]);

  const res = (await db.execute(sql`SELECT count(*)::int AS n FROM orders`)) as unknown as { rows?: { n: number }[] } | { n: number }[];
  const orderCount = Array.isArray(res) ? res[0]?.n : res.rows?.[0]?.n;
  console.log(`Seed completed: ${orderCount ?? "?"} orders. Open book for ${dC}; run for today (${dB}) is on the truck.`);
  console.log("Demo login: lan@gmail.com / demo123 (customer), bacba@xanhtantay.vn / demo123 (farmer)");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
