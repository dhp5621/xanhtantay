import { eq } from "drizzle-orm";
import {
  db, users, farms, products, farm_diary, recipes,
  orders, order_items, subscriptions, group_orders, group_order_members,
} from "./index";

/**
 * Idempotent seed: every row has a fixed id and uses ON CONFLICT DO NOTHING,
 * so `pnpm db:seed` can be re-run safely. Password for all demo accounts: demo123.
 */
const U = (p: string) => `https://images.unsplash.com/${p}?w=600&q=70&auto=format`;
const daysFromNow = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(9, 0, 0, 0); return x; };

async function seed() {
  console.log("Seeding database…");

  await db.insert(users).values([
    { id: "farmer-bac-ba", name: "Bác Ba Nguyễn", phone: "0901234567", email: "bacba@xanhtantay.vn", role: "farmer", password_hash: "$2b$10$example" },
    { id: "farmer-co-tu", name: "Cô Tư Lê", phone: "0912345678", email: "cotu@xanhtantay.vn", role: "farmer", password_hash: "$2b$10$example" },
    { id: "farmer-u-tham", name: "U Thắm Trần", phone: "0923456789", email: "utham@xanhtantay.vn", role: "farmer", password_hash: "$2b$10$example" },
    // Demo customers
    { id: "customer-demo", name: "Nguyễn Thị Lan", phone: "0934567890", email: "lan@gmail.com", role: "customer", password_hash: "$2b$10$example" },
    { id: "customer-minh", name: "Trần Văn Minh", phone: "0945678901", email: "minh@gmail.com", role: "customer", password_hash: "$2b$10$example" },
    { id: "customer-hoa", name: "Lê Thị Hoa", phone: "0956789012", email: "hoa@gmail.com", role: "customer", password_hash: "$2b$10$example" },
  ]).onConflictDoNothing();

  await db.insert(farms).values([
    { id: "farm-bac-ba", owner_id: "farmer-bac-ba", name: "Vườn nhà bác Ba", slug: "vuon-bac-ba", location: "Đà Lạt, Lâm Đồng", description: "Vườn rau sạch hơn 20 năm tuổi trên vùng đất đỏ bazan Đà Lạt. Bác Ba trồng rau theo phương pháp hữu cơ truyền thống, không dùng thuốc trừ sâu.", cover_url: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800" },
    { id: "farm-co-tu", owner_id: "farmer-co-tu", name: "Trang trại cô Tư", slug: "trang-trai-co-tu", location: "Bảo Lộc, Lâm Đồng", description: "Trang trại trồng rau thuỷ canh sạch và rau địa phương theo mùa. Cô Tư áp dụng kỹ thuật trồng hiện đại kết hợp kinh nghiệm truyền thống.", cover_url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800" },
    { id: "farm-u-tham", owner_id: "farmer-u-tham", name: "Vườn quê u Thắm", slug: "vuon-que-u-tham", location: "Củ Chi, TP.HCM", description: "Vườn rau quê gần thành phố, chuyên cung cấp rau củ tươi ngon mỗi ngày. U Thắm trồng theo lịch mùa vụ, luôn có hàng tươi từ vườn đến bàn ăn.", cover_url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800" },
  ]).onConflictDoNothing();

  await db.insert(products).values([
    { id: "p-ba-rau-muong", farm_id: "farm-bac-ba", name: "Rau muống xanh", unit: "kg", price_per_unit: 15000, category: "rau_la", stock_qty: 40, image_url: U("photo-1515543237350-b3eea1ec8082"), in_stock: true },
    { id: "p-ba-bi-do", farm_id: "farm-bac-ba", name: "Bí đỏ Nhật", unit: "kg", price_per_unit: 35000, category: "cu_qua", stock_qty: 40, image_url: U("photo-1570586437263-ab629fccc818"), in_stock: true },
    { id: "p-ba-ca-rot", farm_id: "farm-bac-ba", name: "Cà rốt Đà Lạt", unit: "kg", price_per_unit: 28000, category: "cu_qua", stock_qty: 40, image_url: U("photo-1445282768818-728615cc910a"), in_stock: true },
    { id: "p-ba-cai-xanh", farm_id: "farm-bac-ba", name: "Cải xanh", unit: "bó", price_per_unit: 8000, category: "rau_la", stock_qty: 25, image_url: U("photo-1574943320219-553eb213f72d"), in_stock: true },
    { id: "p-ba-su-hao", farm_id: "farm-bac-ba", name: "Su hào", unit: "củ", price_per_unit: 10000, category: "cu_qua", stock_qty: 0, image_url: U("photo-1594282486552-05b4d80fbb9f"), in_stock: false },
    { id: "p-tu-xa-lach", farm_id: "farm-co-tu", name: "Xà lách cuộn", unit: "kg", price_per_unit: 45000, category: "rau_la", stock_qty: 40, image_url: U("photo-1622206151226-18ca2c9ab4a1"), in_stock: true },
    { id: "p-tu-dua-leo", farm_id: "farm-co-tu", name: "Dưa leo baby", unit: "kg", price_per_unit: 32000, category: "cu_qua", stock_qty: 40, image_url: U("photo-1449300079323-02e209d9d3a6"), in_stock: true },
    { id: "p-tu-ca-chua", farm_id: "farm-co-tu", name: "Cà chua cherry", unit: "kg", price_per_unit: 55000, category: "cu_qua", stock_qty: 40, image_url: U("photo-1592841200221-a6898f307baa"), in_stock: true },
    { id: "p-tu-rau-mam", farm_id: "farm-co-tu", name: "Rau mầm hỗn hợp", unit: "hộp", price_per_unit: 25000, category: "rau_mam", stock_qty: 25, image_url: U("photo-1540420773420-3366772f4999"), in_stock: true },
    { id: "p-tu-hung-que", farm_id: "farm-co-tu", name: "Húng quế", unit: "bó", price_per_unit: 5000, category: "rau_thom", stock_qty: 25, image_url: U("photo-1618375569909-3c8616cf7733"), in_stock: true },
    { id: "p-tham-rau-den", farm_id: "farm-u-tham", name: "Rau dền đỏ", unit: "bó", price_per_unit: 7000, category: "rau_la", stock_qty: 25, image_url: U("photo-1576045057995-568f588f82fb"), in_stock: true },
    { id: "p-tham-mong-toi", farm_id: "farm-u-tham", name: "Mồng tơi", unit: "kg", price_per_unit: 12000, category: "rau_la", stock_qty: 40, image_url: U("photo-1515543237350-b3eea1ec8082"), in_stock: true },
    { id: "p-tham-kho-qua", farm_id: "farm-u-tham", name: "Khổ qua (mướp đắng)", unit: "kg", price_per_unit: 22000, category: "cu_qua", stock_qty: 40, image_url: U("photo-1590779033100-9f60a05a013d"), in_stock: true },
    { id: "p-tham-bau", farm_id: "farm-u-tham", name: "Bầu xanh", unit: "kg", price_per_unit: 18000, category: "cu_qua", stock_qty: 40, image_url: U("photo-1601493700631-2b16ec4b4716"), in_stock: true },
    { id: "p-tham-rau-ngot", farm_id: "farm-u-tham", name: "Rau ngót", unit: "bó", price_per_unit: 6000, category: "rau_la", stock_qty: 25, image_url: U("photo-1576045057995-568f588f82fb"), in_stock: true },
  ]).onConflictDoNothing();

  await db.insert(farm_diary).values([
    { id: "d-ba-1", farm_id: "farm-bac-ba", content: "Hôm nay bác vừa thu hoạch đợt cải xanh đầu mùa. Lứa này ngon lắm, lá to, dày, xanh mướt. Thời tiết Đà Lạt tuần này mát mẻ nên rau lớn nhanh và giòn ngọt hơn thường lệ.", media_urls: ["https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600"], created_at: daysFromNow(-1) },
    { id: "d-ba-2", farm_id: "farm-bac-ba", content: "Sáng sớm tưới nước cho bí đỏ, mấy trái to lắm rồi. Đợt này bác trồng giống bí Nhật mới, ngọt hơn và bở hơn loại thường. Thứ 6 là có thể thu hoạch được rồi đó các bạn.", media_urls: ["https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=600"], created_at: daysFromNow(-3) },
    { id: "d-tu-1", farm_id: "farm-co-tu", content: "Cà chua cherry hôm nay chín đỏ rực cả vườn. Cô hái từ 5 giờ sáng để còn giao hàng kịp buổi trưa. Mấy bạn đặt hàng tuần này sẽ nhận được đợt ngon nhất mùa này nha!", media_urls: ["https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=600"], created_at: daysFromNow(-2) },
    { id: "d-tham-1", farm_id: "farm-u-tham", content: "U mới gieo hạt mồng tơi đợt mới. Khoảng 3 tuần nữa là có hàng. Bạn nào muốn đặt trước liên hệ u nhé, đảm bảo tươi ngon từ vườn lên bàn ăn trong ngày.", media_urls: ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600"], created_at: daysFromNow(-4) },
  ]).onConflictDoNothing();

  await db.insert(recipes).values([
    { id: "r-canh-bi-do", title: "Canh bí đỏ thịt băm", ingredients: ["bí đỏ", "thịt băm", "hành lá", "muối", "đường", "nước mắm"], steps: ["Bí đỏ gọt vỏ, cắt hạt lựu vừa ăn.", "Thịt băm ướp với nước mắm, hành, tiêu 10 phút.", "Phi thơm hành, xào thịt chín vàng.", "Đổ nước, bỏ bí vào nấu sôi.", "Nêm vừa ăn, tắt bếp, rắc hành lá."] },
    { id: "r-rau-muong-xao", title: "Rau muống xào tỏi", ingredients: ["rau muống", "tỏi", "dầu ăn", "nước mắm", "muối"], steps: ["Rau muống nhặt sạch, cắt khúc vừa ăn.", "Phi tỏi thơm với dầu nóng.", "Cho rau vào xào lửa to, đảo đều tay.", "Nêm nước mắm, muối vừa ăn.", "Xào đến khi rau vừa chín tới, không mềm quá."] },
    { id: "r-canh-cai-tom", title: "Canh cải xanh nấu tôm", ingredients: ["cải xanh", "tôm tươi", "gừng", "nước mắm", "muối"], steps: ["Tôm rửa sạch, lột vỏ, giữ đuôi.", "Cải xanh tách lá, rửa sạch.", "Đun sôi nước, cho tôm vào trước.", "Tôm chín hồng, bỏ cải vào, nấu thêm 2 phút.", "Nêm gia vị vừa ăn, múc ra tô."] },
    { id: "r-dua-leo-tron", title: "Dưa leo trộn tôm khô", ingredients: ["dưa leo baby", "tôm khô", "tỏi", "ớt", "chanh", "đường", "nước mắm"], steps: ["Dưa leo rửa sạch, chẻ đôi hoặc thái lát.", "Tôm khô ngâm nước ấm 10 phút.", "Pha nước trộn: chanh, đường, nước mắm, tỏi, ớt.", "Trộn đều dưa leo và tôm khô với nước trộn.", "Để ngấm 10 phút trước khi ăn."] },
    { id: "r-kho-qua-nhoi", title: "Khổ qua nhồi thịt", ingredients: ["khổ qua", "thịt băm", "miến", "nấm mèo", "trứng", "nước mắm", "tiêu"], steps: ["Khổ qua cắt khoanh, bỏ ruột.", "Miến và nấm mèo ngâm nở, thái nhỏ.", "Trộn thịt, miến, nấm, trứng, gia vị.", "Nhồi hỗn hợp thịt vào khúc khổ qua.", "Hấp hoặc kho nhỏ lửa 20–25 phút."] },
  ]).onConflictDoNothing();

  // ── Demo customer activity (chị Lan) ─────────────────────────────
  await db.insert(orders).values([
    { id: "o-demo-1", user_id: "customer-demo", farm_id: "farm-bac-ba", status: "delivered", type: "single", total: 15000 * 2 + 8000 * 3, note: "Giao buổi sáng giúp em", created_at: daysFromNow(-9) },
    { id: "o-demo-2", user_id: "customer-demo", farm_id: "farm-co-tu", status: "loaded", type: "single", total: 55000 + 25000 * 2, created_at: daysFromNow(-1) },
    { id: "o-demo-3", user_id: "customer-demo", farm_id: "farm-u-tham", status: "harvesting", type: "subscription", total: 12000 * 2 + 7000 * 3, note: "Đơn tự động từ gói đăng ký", created_at: daysFromNow(0) },
    { id: "o-minh-1", user_id: "customer-minh", farm_id: "farm-bac-ba", status: "harvesting", type: "single", total: 35000 * 2, created_at: daysFromNow(0) },
  ]).onConflictDoNothing();

  await db.insert(order_items).values([
    { id: "oi-1", order_id: "o-demo-1", product_id: "p-ba-rau-muong", quantity: "2", unit_price: 15000 },
    { id: "oi-2", order_id: "o-demo-1", product_id: "p-ba-cai-xanh", quantity: "3", unit_price: 8000 },
    { id: "oi-3", order_id: "o-demo-2", product_id: "p-tu-ca-chua", quantity: "1", unit_price: 55000 },
    { id: "oi-4", order_id: "o-demo-2", product_id: "p-tu-rau-mam", quantity: "2", unit_price: 25000 },
    { id: "oi-5", order_id: "o-demo-3", product_id: "p-tham-mong-toi", quantity: "2", unit_price: 12000 },
    { id: "oi-6", order_id: "o-demo-3", product_id: "p-tham-rau-den", quantity: "3", unit_price: 7000 },
    { id: "oi-7", order_id: "o-minh-1", product_id: "p-ba-bi-do", quantity: "2", unit_price: 35000 },
  ]).onConflictDoNothing();

  await db.insert(subscriptions).values([
    { id: "sub-demo-1", user_id: "customer-demo", farm_id: "farm-u-tham", frequency: "weekly", next_delivery: daysFromNow(6), active: true, items: [{ product_id: "p-tham-mong-toi", quantity: 2 }, { product_id: "p-tham-rau-den", quantity: 3 }] },
  ]).onConflictDoNothing();

  await db.insert(group_orders).values([
    { id: "g-sunrise", farm_id: "farm-bac-ba", title: "Rau sạch chung cư Sunrise", min_members: 5, current_members: 3, deadline: daysFromNow(2), status: "open", shipping_address: "Sảnh A, chung cư Sunrise, Q.7" },
    { id: "g-phu-nhuan", farm_id: "farm-co-tu", title: "Hội mẹ bỉm Phú Nhuận", min_members: 4, current_members: 4, deadline: daysFromNow(1), status: "open", shipping_address: "123 Phan Xích Long, Phú Nhuận" },
    { id: "g-thu-duc", farm_id: "farm-u-tham", title: "Rau quê xóm trọ Thủ Đức", min_members: 6, current_members: 1, deadline: daysFromNow(5), status: "open", shipping_address: "Hẻm 45 Võ Văn Ngân, Thủ Đức" },
  ]).onConflictDoNothing();

  await db.insert(group_order_members).values([
    { id: "gm-1", group_order_id: "g-sunrise", user_id: "customer-demo", items: [{ product_id: "p-ba-rau-muong", quantity: 1 }] },
    { id: "gm-2", group_order_id: "g-sunrise", user_id: "customer-minh", items: [] },
    { id: "gm-3", group_order_id: "g-sunrise", user_id: "customer-hoa", items: [] },
    { id: "gm-4", group_order_id: "g-phu-nhuan", user_id: "customer-hoa", items: [] },
    { id: "gm-5", group_order_id: "g-phu-nhuan", user_id: "customer-minh", items: [] },
    { id: "gm-6", group_order_id: "g-phu-nhuan", user_id: "farmer-co-tu", items: [] },
    { id: "gm-7", group_order_id: "g-phu-nhuan", user_id: "farmer-u-tham", items: [] },
    { id: "gm-8", group_order_id: "g-thu-duc", user_id: "customer-hoa", items: [] },
  ]).onConflictDoNothing();

  // Keep member counts truthful even if a previous seed run drifted.
  for (const [gid, n] of [["g-sunrise", 3], ["g-phu-nhuan", 4], ["g-thu-duc", 1]] as const) {
    await db.update(group_orders).set({ current_members: n }).where(eq(group_orders.id, gid));
  }

  console.log("Seed completed! Demo login: lan@gmail.com / demo123 (customer), bacba@xanhtantay.vn / demo123 (farmer)");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
