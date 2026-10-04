/**
 * Demo data for the pilot: Hà Nội pickup points for students and young renters (dormitories, areas of rented rooms), farms in Bắc Kạn and Tuyên Quang, seasonal boxes.
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
// Box photos live in apps/web/public/boxes. The mobile app loads images by absolute URL, so they
// are addressed on the deployed site (the same default the app uses for its API).
const B = (f: string) => `https://xanhtantay.vercel.app/boxes/${f}`;

async function seed() {
  const { db } = await import("./index");
  const s = await import("./schema");
  const { MENU_ME_GUI, MENU_VUNG_CAO, MENU_CU_QUA } = await import("./menu");
  const { addDays, todayVN, nextDeliveryDate, deliveryDayOnOrAfter, deliveryDayOnOrBefore, careMessageFor, vnInstant, shipFeeFor } = await import("../lib/commerce");
  const { runCutoff, advanceRun } = await import("../lib/brain");
  const { sql, inArray } = await import("drizzle-orm");

  console.log("Seeding…");
  // Transactional data is rebuilt from scratch.
  await db.execute(sql`TRUNCATE harvest_commands, orders, harvest_runs, group_orders, subscriptions RESTART IDENTITY CASCADE`);

  // Pickup points where students and young workers away from home live: dormitories and areas of rented rooms.
  await db.insert(s.clusters).values([
    { id: "cl-ktx-bach-khoa", name: "Ký túc xá Bách Khoa", address: "Phố Trần Đại Nghĩa", district: "Hai Bà Trưng" },
    { id: "cl-ktx-me-tri", name: "Ký túc xá Mễ Trì", address: "182 Lương Thế Vinh", district: "Thanh Xuân" },
    { id: "cl-tro-cau-giay", name: "Khu trọ Cầu Giấy", address: "Quanh ngõ 165 Cầu Giấy, Dịch Vọng", district: "Cầu Giấy" },
    { id: "cl-tro-dong-da", name: "Khu trọ Đống Đa", address: "Quanh phố Chùa Láng", district: "Đống Đa" },
    { id: "cl-tro-thanh-xuan", name: "Khu trọ Thanh Xuân", address: "Quanh ngõ 72 Nguyễn Trãi", district: "Thanh Xuân" },
  ]).onConflictDoUpdate({ target: s.clusters.id, set: { name: sql`excluded.name`, address: sql`excluded.address`, district: sql`excluded.district` } });

  const up = { password_hash: "$2b$10$example" };
  await db.insert(s.users).values([
    { id: "farmer-bac-ba", gender: "male", salutation: null, short_name: "Ba", name: "Bác Ba Nguyễn", phone: "0901234567", email: "bacba@xanhtantay.vn", role: "farmer", ...up },
    { id: "farmer-co-tu", gender: "female", salutation: null, short_name: "Tư", name: "Cô Tư Lê", phone: "0912345678", email: "cotu@xanhtantay.vn", role: "farmer", ...up },
    { id: "farmer-u-tham", gender: "female", salutation: "u", short_name: "Thắm", name: "U Thắm Trần", phone: "0923456789", email: "utham@xanhtantay.vn", role: "farmer", ...up },
    { id: "farmer-bac-tu", gender: "male", salutation: null, short_name: "Tư", name: "Bác Tư Hoàng", phone: "0967890123", email: "bactu@xanhtantay.vn", role: "farmer", ...up },
    // Customers are students and young workers living away from home, addressed as "bạn".
    { id: "customer-demo", gender: "female", salutation: "bạn", short_name: "Lan", name: "Nguyễn Thị Lan", phone: "0934567890", email: "lan@gmail.com", role: "customer", cluster_id: "cl-ktx-bach-khoa", address: "Nhà B6 · phòng 412", ...up },
    { id: "customer-minh", gender: "male", salutation: "bạn", short_name: "Minh", name: "Trần Văn Minh", phone: "0945678901", email: "minh@gmail.com", role: "customer", cluster_id: "cl-ktx-bach-khoa", address: "Nhà B9 · phòng 207", ...up },
    { id: "customer-hoa", gender: "female", salutation: "bạn", short_name: "Hoa", name: "Lê Thị Hoa", phone: "0956789012", email: "hoa@gmail.com", role: "customer", cluster_id: "cl-ktx-me-tri", address: "Nhà C2 · phòng 305", ...up },
    { id: "customer-quan", gender: "male", salutation: "bạn", short_name: "Quân", name: "Phạm Anh Quân", phone: "0978901234", email: "quan@gmail.com", role: "customer", cluster_id: "cl-tro-cau-giay", address: "Ngõ 165 Cầu Giấy · phòng 3", ...up },
    { id: "customer-mai", gender: "female", salutation: "bạn", short_name: "Mai", name: "Đỗ Thanh Mai", phone: "0989012345", email: "mai@gmail.com", role: "customer", cluster_id: "cl-ktx-bach-khoa", address: "Nhà B3 · phòng 118", ...up },
    { id: "customer-son", gender: "male", salutation: "bạn", short_name: "Sơn", name: "Vũ Hồng Sơn", phone: "0990123456", email: "son@gmail.com", role: "customer", cluster_id: "cl-tro-thanh-xuan", address: "Ngõ 72 Nguyễn Trãi · phòng 201", ...up },
  ]).onConflictDoUpdate({ target: s.users.id, set: { cluster_id: sql`excluded.cluster_id`, address: sql`excluded.address`, name: sql`excluded.name`, phone: sql`excluded.phone`, gender: sql`excluded.gender`, salutation: sql`excluded.salutation`, short_name: sql`excluded.short_name` } });
  // The apartment complexes of the earlier demo are gone (an account that still pointed at one loses its pickup point).
  await db.delete(s.clusters).where(inArray(s.clusters.id, ["cl-times-city", "cl-royal-city", "cl-smart-city", "cl-goldmark", "cl-linh-dam"]));

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
    { id: "pr-cu-cai", name: "Củ cải trắng", category: "cu_qua", image_url: C("Daikon 20220423 083159.jpg") },
    { id: "pr-dau-co-ve", name: "Đậu cô ve", category: "cu_qua", image_url: C("Des haricots verts.jpg") },
    { id: "pr-sup-lo", name: "Súp lơ xanh", category: "rau_la", image_url: C("Fire-Tuscarora Organic Growers - Broccoli head.jpg") },
  ]).onConflictDoUpdate({ target: s.produce.id, set: { name: sql`excluded.name`, image_url: sql`excluded.image_url`, category: sql`excluded.category` } });

  const cap = (farm: string, list: [string, number][]) => list.map(([p, kg]) => ({ id: `cap-${farm}-${p}`, farm_id: `farm-${farm}`, produce_id: `pr-${p}`, daily_kg: kg }));
  await db.insert(s.farm_capacity).values([
    ...cap("bac-ba", [["ca-rot", 40], ["bap-cai", 60], ["su-hao", 30], ["khoai-tay", 40], ["cu-cai", 30]]),
    ...cap("co-tu", [["cai-meo", 25], ["cai-ngot", 30], ["su-su", 40], ["ca-chua", 20], ["dau-co-ve", 20], ["sup-lo", 20]]),
    ...cap("u-tham", [["bi-do", 60], ["ca-chua", 30], ["bap-cai", 40], ["ca-rot", 25], ["dau-co-ve", 20]]),
    ...cap("bac-tu", [["su-su", 30], ["cai-meo", 20], ["khoai-tay", 50], ["bi-do", 40], ["su-hao", 20], ["cu-cai", 25], ["sup-lo", 15]]),
  ]).onConflictDoUpdate({ target: s.farm_capacity.id, set: { daily_kg: sql`excluded.daily_kg` } });

  // Three mixes a season, each in three sizes (like clothing). Every box feeds its room for 7 days.
  // Every mix has the same price per size.
  const SIZES = { S: { label: "Nhỏ", slug: "nho", kg: 3, servings: 1, who: "1 người ở một mình" }, M: { label: "Vừa", slug: "vua", kg: 6, servings: 2, who: "phòng 2 người" }, L: { label: "Lớn", slug: "lon", kg: 12, servings: 4, who: "phòng 3–4 người nấu chung" } } as const;
  const PRICE = { S: 190000, M: 320000, L: 520000 };
  type Size = keyof typeof SIZES;
  const MIXES: { mix: string; name: string; idPrefix: string; slugPrefix: string; image: string; menu: typeof MENU_ME_GUI; blurb: string; price: Record<Size, number>; items: Record<Size, [string, number][]> }[] = [
    {
      mix: "me-gui", name: "Thùng rau mẹ gửi", idPrefix: "box", slugPrefix: "hop", image: B("me-gui.jpg"), menu: MENU_ME_GUI,
      blurb: "Mix cân bằng giữa rau lá và củ quả, như thùng rau mẹ gửi từ quê lên.",
      price: PRICE,
      // 3, 6 and 12 kg in 0.5 kg steps. A 3 kg box holds six kinds; the seventh joins from size M.
      items: {
        S: [["bap-cai", 0.5], ["ca-rot", 0.5], ["ca-chua", 0.5], ["cai-ngot", 0.5], ["su-su", 0.5], ["khoai-tay", 0.5]],
        M: [["bap-cai", 1], ["ca-rot", 1], ["ca-chua", 1], ["cai-ngot", 0.5], ["su-su", 1], ["khoai-tay", 0.5], ["bi-do", 1]],
        L: [["bap-cai", 2.5], ["ca-rot", 2], ["ca-chua", 2], ["cai-ngot", 1], ["su-su", 1.5], ["khoai-tay", 1.5], ["bi-do", 1.5]],
      },
    },
    {
      mix: "vung-cao", name: "Nương rau vùng cao", idPrefix: "box-vc", slugPrefix: "vung-cao", image: B("vung-cao.jpg"), menu: MENU_VUNG_CAO,
      blurb: "Nhiều rau xanh: cải mèo, cải ngọt, súp lơ, đậu cô ve hái trên nương.",
      price: PRICE,
      items: {
        S: [["bap-cai", 0.5], ["cai-meo", 0.5], ["cai-ngot", 0.5], ["sup-lo", 0.5], ["dau-co-ve", 0.5], ["ca-chua", 0.5]],
        M: [["bap-cai", 1], ["cai-meo", 1], ["cai-ngot", 1], ["sup-lo", 1], ["dau-co-ve", 1], ["su-su", 0.5], ["ca-chua", 0.5]],
        L: [["bap-cai", 2.5], ["cai-meo", 2], ["cai-ngot", 2], ["sup-lo", 2], ["dau-co-ve", 1.5], ["su-su", 1], ["ca-chua", 1]],
      },
    },
    {
      mix: "cu-qua", name: "Củ quả hầm canh", idPrefix: "box-cq", slugPrefix: "cu-qua", image: B("cu-qua.jpg"), menu: MENU_CU_QUA,
      blurb: "Củ quả chắc tay để hầm, kho, nấu canh; để được lâu nhất trong ba mix.",
      price: PRICE,
      items: {
        S: [["bi-do", 0.5], ["ca-rot", 0.5], ["khoai-tay", 0.5], ["su-hao", 0.5], ["cu-cai", 0.5], ["ca-chua", 0.5]],
        M: [["bi-do", 1], ["ca-rot", 1], ["khoai-tay", 1], ["su-hao", 1], ["cu-cai", 1], ["bap-cai", 0.5], ["ca-chua", 0.5]],
        L: [["bi-do", 2.5], ["ca-rot", 2], ["khoai-tay", 2], ["su-hao", 2], ["cu-cai", 1.5], ["bap-cai", 1], ["ca-chua", 1]],
      },
    },
  ];
  const sizes = Object.keys(SIZES) as Size[];
  const boxId = (m: (typeof MIXES)[number], z: Size) => `${m.idPrefix}-${z.toLowerCase()}`;
  await db.insert(s.boxes).values(MIXES.flatMap((m) => sizes.map((z) => ({
    id: boxId(m, z), slug: `${m.slugPrefix}-${SIZES[z].slug}`, name: `${m.name} · ${SIZES[z].label}`, mix: m.mix, mix_name: m.name, size: z,
    weight_kg: String(SIZES[z].kg), price: m.price[z], season: "Thu 2026", servings: SIZES[z].servings, days: 7, image_url: m.image, meal_plan: m.menu,
    description: `${m.blurb} ${SIZES[z].kg} kg cho ${SIZES[z].who}, đủ nấu 7 ngày, mỗi ngày hai bữa. Rau lá ăn trước, củ quả để sau.`,
  })))).onConflictDoUpdate({ target: s.boxes.id, set: { name: sql`excluded.name`, slug: sql`excluded.slug`, mix: sql`excluded.mix`, mix_name: sql`excluded.mix_name`, size: sql`excluded.size`, price: sql`excluded.price`, weight_kg: sql`excluded.weight_kg`, season: sql`excluded.season`, servings: sql`excluded.servings`, days: sql`excluded.days`, image_url: sql`excluded.image_url`, meal_plan: sql`excluded.meal_plan`, description: sql`excluded.description`, active: sql`true` } });

  const seeded = MIXES.flatMap((m) => sizes.map((z) => boxId(m, z)));
  await db.delete(s.box_items).where(inArray(s.box_items.box_id, seeded));
  await db.insert(s.box_items).values(MIXES.flatMap((m) => sizes.flatMap((z) => m.items[z].map(([p, kg]) => ({ id: `bi-${boxId(m, z)}-${p}`, box_id: boxId(m, z), produce_id: `pr-${p}`, quantity_kg: String(kg) })))));
  for (const m of MIXES) for (const z of sizes) {
    const kg = m.items[z].reduce((t, [, k]) => t + k, 0);
    if (kg !== SIZES[z].kg) throw new Error(`${boxId(m, z)}: contents weigh ${kg} kg, box says ${SIZES[z].kg} kg`);
  }

  // ── Demo activity, relative to today. Every delivery date is a delivery day (Wednesday or Sunday). ──
  const today = todayVN();
  const price = Object.fromEntries(MIXES.flatMap((m) => sizes.map((z) => [boxId(m, z), m.price[z]]))) as Record<string, number>;
  const sizeOf = Object.fromEntries(MIXES.flatMap((m) => sizes.map((z) => [boxId(m, z), z]))) as Record<string, Size>;
  const who = { "customer-demo": ["cl-ktx-bach-khoa", "Nhà B6 · phòng 412"], "customer-minh": ["cl-ktx-bach-khoa", "Nhà B9 · phòng 207"], "customer-hoa": ["cl-ktx-me-tri", "Nhà C2 · phòng 305"], "customer-quan": ["cl-tro-cau-giay", "Ngõ 165 Cầu Giấy · phòng 3"], "customer-mai": ["cl-ktx-bach-khoa", "Nhà B3 · phòng 118"], "customer-son": ["cl-tro-thanh-xuan", "Ngõ 72 Nguyễn Trãi · phòng 201"] } as Record<string, [string, string]>;
  // Every order pays the delivery fee of its size per box; a group that fills gets it back to 0 at cut-off.
  const order = (id: string, user: string, box: string, qty: number, date: string, type: "single" | "subscription" | "group" = "single", extra: Partial<typeof s.orders.$inferInsert> = {}) => {
    const subtotal = price[box] * qty, ship = shipFeeFor(sizeOf[box], qty);
    return { id, user_id: user, box_id: box, quantity: qty, type, status: "placed" as const, subtotal, ship_fee: ship, total: subtotal + ship, cluster_id: who[user][0], address: who[user][1], delivery_date: date, care_message: careMessageFor(id), payment_method: "transfer", payment_status: "pending", ...extra };
  };

  const dB = deliveryDayOnOrBefore(today);            // the latest delivery day up to today
  const dA = deliveryDayOnOrBefore(addDays(dB, -1));  // the delivery day before it
  const dC = nextDeliveryDate();                      // the open book
  const dD = deliveryDayOnOrAfter(addDays(dC, 1)), dE = deliveryDayOnOrAfter(addDays(dD, 1));

  // Subscriptions
  await db.insert(s.subscriptions).values([
    { id: "sub-demo-1", user_id: "customer-demo", box_id: "box-m", quantity: 1, frequency: "weekly", next_delivery: dA, cluster_id: "cl-ktx-bach-khoa", address: "Nhà B6 · phòng 412" },
    { id: "sub-hoa-1", user_id: "customer-hoa", box_id: "box-s", quantity: 1, frequency: "weekly", next_delivery: dC, cluster_id: "cl-ktx-me-tri", address: "Nhà C2 · phòng 305" },
    { id: "sub-son-1", user_id: "customer-son", box_id: "box-l", quantity: 1, frequency: "biweekly", next_delivery: dD, cluster_id: "cl-tro-thanh-xuan", address: "Ngõ 72 Nguyễn Trãi · phòng 201" },
  ]);

  // Run A: the delivery day before the latest one, delivered
  await db.insert(s.orders).values([
    order("o-a1", "customer-minh", "box-s", 1, dA, "single", { created_at: vnInstant(addDays(dA, -1), "10:20"), payment_method: "cod" }),
    order("o-a2", "customer-quan", "box-cq-l", 1, dA, "single", { created_at: vnInstant(addDays(dA, -1), "15:05") }),
  ]);
  const a = await runCutoff(dA); // also materialises Lan's subscription order for that day
  await db.execute(sql`UPDATE harvest_runs SET cutoff_at = ${vnInstant(addDays(dA, -1), "18:00").toISOString()} WHERE id = ${a.run_id}`);
  await db.execute(sql`UPDATE harvest_commands SET status = 'confirmed', confirmed_at = ${vnInstant(addDays(dA, -1), "18:40").toISOString()}, created_at = ${vnInstant(addDays(dA, -1), "18:00").toISOString()} WHERE run_id = ${a.run_id}`);
  for (let i = 0; i < 3; i++) await advanceRun(a.run_id);
  await db.execute(sql`UPDATE harvest_runs SET harvested_at = ${vnInstant(dA, "4:00").toISOString()}, loaded_at = ${vnInstant(dA, "6:00").toISOString()}, delivered_at = ${vnInstant(dA, "16:00").toISOString()} WHERE id = ${a.run_id}`);
  await db.execute(sql`UPDATE orders SET payment_status = 'paid', harvested_at = ${vnInstant(dA, "4:00").toISOString()}, loaded_at = ${vnInstant(dA, "6:00").toISOString()}, delivered_at = ${vnInstant(dA, "16:00").toISOString()} WHERE run_id = ${a.run_id}`);

  // Run B: the latest delivery day. On the truck when that is today, delivered when it was earlier this week.
  // Lan's box here was ordered for a relative ("Đặt cho người thân"): prepaid, with the sender's own note.
  await db.insert(s.orders).values([
    order("o-b1", "customer-demo", "box-s", 1, dB, "single", { created_at: vnInstant(addDays(dB, -1), "9:12"), note: "Gửi phòng bảo vệ ký túc xá giúp em", cluster_id: "cl-ktx-me-tri", address: "Nhà C1 · phòng 210", recipient_name: "Nguyễn Văn Nam", recipient_phone: "0961234567", care_message: "Chị gửi rau quê cho em, nhớ nấu cơm chứ đừng ăn mì mãi nhé." }),
    order("o-b2", "customer-mai", "box-vc-s", 1, dB, "single", { created_at: vnInstant(addDays(dB, -1), "11:40") }),
    order("o-b3", "customer-son", "box-m", 2, dB, "single", { created_at: vnInstant(addDays(dB, -1), "16:30") }),
  ]);
  const b = await runCutoff(dB);
  await db.execute(sql`UPDATE harvest_runs SET cutoff_at = ${vnInstant(addDays(dB, -1), "18:00").toISOString()} WHERE id = ${b.run_id}`);
  await db.execute(sql`UPDATE harvest_commands SET status = 'confirmed', confirmed_at = ${vnInstant(addDays(dB, -1), "19:05").toISOString()}, created_at = ${vnInstant(addDays(dB, -1), "18:00").toISOString()} WHERE run_id = ${b.run_id}`);
  await advanceRun(b.run_id); await advanceRun(b.run_id);
  await db.execute(sql`UPDATE harvest_runs SET harvested_at = ${vnInstant(dB, "4:00").toISOString()}, loaded_at = ${vnInstant(dB, "6:00").toISOString()} WHERE id = ${b.run_id}`);
  await db.execute(sql`UPDATE orders SET payment_status = 'paid', harvested_at = ${vnInstant(dB, "4:00").toISOString()}, loaded_at = ${vnInstant(dB, "6:00").toISOString()} WHERE run_id = ${b.run_id}`);
  if (dB !== today) {
    await advanceRun(b.run_id);
    await db.execute(sql`UPDATE harvest_runs SET delivered_at = ${vnInstant(dB, "16:00").toISOString()} WHERE id = ${b.run_id}`);
    await db.execute(sql`UPDATE orders SET delivered_at = ${vnInstant(dB, "16:00").toISOString()} WHERE run_id = ${b.run_id}`);
  }

  // Open book: pre-orders for the next delivery day, waiting for its 18:00 cut-off (admin can close it live)
  await db.insert(s.group_orders).values([
    { id: "g-bach-khoa", cluster_id: "cl-ktx-bach-khoa", box_id: "box-m", title: "Hội nấu cơm nhà B6–B9 Bách Khoa", min_members: 4, current_members: 3, delivery_date: dC, created_by: "customer-demo" },
    { id: "g-me-tri", cluster_id: "cl-ktx-me-tri", box_id: "box-s", title: "Phòng nữ nhà C2 Mễ Trì", min_members: 3, current_members: 1, delivery_date: dD, created_by: "customer-hoa" },
    { id: "g-cau-giay", cluster_id: "cl-tro-cau-giay", box_id: "box-l", title: "Xóm trọ ngõ 165 gom hộp lớn", min_members: 3, current_members: 1, delivery_date: dE, created_by: "customer-quan" },
  ]);
  await db.insert(s.orders).values([
    order("o-c1", "customer-demo", "box-m", 1, dC, "group", { group_order_id: "g-bach-khoa" }),
    order("o-c2", "customer-minh", "box-m", 1, dC, "group", { group_order_id: "g-bach-khoa", payment_method: "cod" }),
    order("o-c3", "customer-mai", "box-m", 2, dC, "group", { group_order_id: "g-bach-khoa" }),
    order("o-c4", "customer-quan", "box-vc-m", 1, dC, "single"),
    order("o-c5", "customer-son", "box-cq-s", 2, dC, "single", { payment_method: "cod" }),
    order("o-c6", "customer-hoa", "box-s", 1, dD, "group", { group_order_id: "g-me-tri" }),
    order("o-c7", "customer-quan", "box-l", 1, dE, "group", { group_order_id: "g-cau-giay" }),
  ]);

  const res = (await db.execute(sql`SELECT count(*)::int AS n FROM orders`)) as unknown as { rows?: { n: number }[] } | { n: number }[];
  const orderCount = Array.isArray(res) ? res[0]?.n : res.rows?.[0]?.n;
  console.log(`Seed completed: ${orderCount ?? "?"} orders. Open book for ${dC}; the run for ${dB} is ${dB === today ? "on the truck" : "delivered"}; the run for ${dA} is delivered.`);
  console.log("Demo login: lan@gmail.com / demo123 (customer), bacba@xanhtantay.vn / demo123 (farmer)");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
