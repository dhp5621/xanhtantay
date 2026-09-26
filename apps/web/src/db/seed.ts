import { db, users, farms, products, farm_diary, recipes } from "./index";

async function seed() {
  console.log("Seeding database...");

  // Farmers
  const [bacBa, coTu, uTham] = await db.insert(users).values([
    {
      id: "farmer-bac-ba",
      name: "Bác Ba Nguyễn",
      phone: "0901234567",
      email: "bacba@xanhtantay.vn",
      role: "farmer",
      avatar_url: null,
      password_hash: "$2b$10$example",
    },
    {
      id: "farmer-co-tu",
      name: "Cô Tư Lê",
      phone: "0912345678",
      email: "cotu@xanhtantay.vn",
      role: "farmer",
      avatar_url: null,
      password_hash: "$2b$10$example",
    },
    {
      id: "farmer-u-tham",
      name: "U Thắm Trần",
      phone: "0923456789",
      email: "utham@xanhtantay.vn",
      role: "farmer",
      avatar_url: null,
      password_hash: "$2b$10$example",
    },
  ]).returning();

  // Demo customer
  await db.insert(users).values({
    id: "customer-demo",
    name: "Nguyễn Thị Lan",
    phone: "0934567890",
    email: "lan@gmail.com",
    role: "customer",
    avatar_url: null,
    password_hash: "$2b$10$example",
  }).onConflictDoNothing();

  // Farms
  const [farmBa, farmTu, farmTham] = await db.insert(farms).values([
    {
      id: "farm-bac-ba",
      owner_id: "farmer-bac-ba",
      name: "Vườn nhà bác Ba",
      slug: "vuon-bac-ba",
      location: "Đà Lạt, Lâm Đồng",
      description: "Vườn rau sạch hơn 20 năm tuổi trên vùng đất đỏ bazan Đà Lạt. Bác Ba trồng rau theo phương pháp hữu cơ truyền thống, không dùng thuốc trừ sâu.",
      cover_url: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800",
    },
    {
      id: "farm-co-tu",
      owner_id: "farmer-co-tu",
      name: "Trang trại cô Tư",
      slug: "trang-trai-co-tu",
      location: "Bảo Lộc, Lâm Đồng",
      description: "Trang trại trồng rau thuỷ canh sạch và rau địa phương theo mùa. Cô Tư áp dụng kỹ thuật trồng hiện đại kết hợp kinh nghiệm truyền thống.",
      cover_url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800",
    },
    {
      id: "farm-u-tham",
      owner_id: "farmer-u-tham",
      name: "Vườn quê u Thắm",
      slug: "vuon-que-u-tham",
      location: "Củ Chi, TP.HCM",
      description: "Vườn rau quê gần thành phố, chuyên cung cấp rau củ tươi ngon mỗi ngày. U Thắm trồng theo lịch mùa vụ, luôn có hàng tươi từ vườn đến bàn ăn.",
      cover_url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800",
    },
  ]).returning();

  // Products for farm bac Ba
  await db.insert(products).values([
    { farm_id: "farm-bac-ba", name: "Rau muống xanh", unit: "kg", price_per_unit: 15000, category: "rau_la", in_stock: true },
    { farm_id: "farm-bac-ba", name: "Bí đỏ Nhật", unit: "kg", price_per_unit: 35000, category: "cu_qua", in_stock: true },
    { farm_id: "farm-bac-ba", name: "Cà rốt đà lạt", unit: "kg", price_per_unit: 28000, category: "cu_qua", in_stock: true },
    { farm_id: "farm-bac-ba", name: "Cải xanh", unit: "bó", price_per_unit: 8000, category: "rau_la", in_stock: true },
    { farm_id: "farm-bac-ba", name: "Su hào", unit: "củ", price_per_unit: 10000, category: "cu_qua", in_stock: false },
  ]);

  // Products for farm co Tu
  await db.insert(products).values([
    { farm_id: "farm-co-tu", name: "Xà lách cuộn", unit: "kg", price_per_unit: 45000, category: "rau_la", in_stock: true },
    { farm_id: "farm-co-tu", name: "Dưa leo baby", unit: "kg", price_per_unit: 32000, category: "cu_qua", in_stock: true },
    { farm_id: "farm-co-tu", name: "Cà chua cherry", unit: "kg", price_per_unit: 55000, category: "cu_qua", in_stock: true },
    { farm_id: "farm-co-tu", name: "Rau mầm hỗn hợp", unit: "hộp", price_per_unit: 25000, category: "rau_mam", in_stock: true },
    { farm_id: "farm-co-tu", name: "Húng quế", unit: "bó", price_per_unit: 5000, category: "rau_thom", in_stock: true },
  ]);

  // Products for farm u Tham
  await db.insert(products).values([
    { farm_id: "farm-u-tham", name: "Rau dền đỏ", unit: "bó", price_per_unit: 7000, category: "rau_la", in_stock: true },
    { farm_id: "farm-u-tham", name: "Mồng tơi", unit: "kg", price_per_unit: 12000, category: "rau_la", in_stock: true },
    { farm_id: "farm-u-tham", name: "Khổ qua (mướp đắng)", unit: "kg", price_per_unit: 22000, category: "cu_qua", in_stock: true },
    { farm_id: "farm-u-tham", name: "Bầu xanh", unit: "kg", price_per_unit: 18000, category: "cu_qua", in_stock: true },
    { farm_id: "farm-u-tham", name: "Rau ngót", unit: "bó", price_per_unit: 6000, category: "rau_la", in_stock: true },
  ]);

  // Farm diary entries
  await db.insert(farm_diary).values([
    {
      farm_id: "farm-bac-ba",
      content: "Hôm nay bác vừa thu hoạch đợt cải xanh đầu mùa. Lứa này ngon lắm, lá to, dày, xanh mướt. Thời tiết Đà Lạt tuần này mát mẻ nên rau lớn nhanh và giòn ngọt hơn thường lệ. 🥬",
      media_urls: ["https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600"],
    },
    {
      farm_id: "farm-bac-ba",
      content: "Sáng sớm tưới nước cho bí đỏ, mấy trái to lắm rồi. Đợt này bác trồng giống bí Nhật mới, ngọt hơn và bở hơn loại thường. Thứ 6 là có thể thu hoạch được rồi đó các bạn. 🎃",
      media_urls: ["https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=600"],
    },
    {
      farm_id: "farm-co-tu",
      content: "Cà chua cherry hôm nay chín đỏ rực cả vườn. Cô hái từ 5 giờ sáng để còn giao hàng kịp buổi trưa. Mấy bạn đặt hàng tuần này sẽ nhận được đợt ngon nhất mùa này nha! 🍅",
      media_urls: ["https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=600"],
    },
    {
      farm_id: "farm-u-tham",
      content: "U mới gieo hạt mồng tơi đợt mới. Khoảng 3 tuần nữa là có hàng. Bạn nào muốn đặt trước liên hệ u nhé, đảm bảo tươi ngon từ vườn lên bàn ăn trong ngày. 🌱",
      media_urls: ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600"],
    },
  ]);

  // Recipes
  await db.insert(recipes).values([
    {
      title: "Canh bí đỏ thịt băm",
      ingredients: ["bí đỏ", "thịt băm", "hành lá", "muối", "đường", "nước mắm"],
      steps: [
        "Bí đỏ gọt vỏ, cắt hạt lựu vừa ăn.",
        "Thịt băm ướp với nước mắm, hành, tiêu 10 phút.",
        "Phi thơm hành, xào thịt chín vàng.",
        "Đổ nước, bỏ bí vào nấu sôi.",
        "Nêm vừa ăn, tắt bếp, rắc hành lá.",
      ],
      image_url: null,
    },
    {
      title: "Rau muống xào tỏi",
      ingredients: ["rau muống", "tỏi", "dầu ăn", "nước mắm", "muối"],
      steps: [
        "Rau muống nhặt sạch, cắt khúc vừa ăn.",
        "Phi tỏi thơm với dầu nóng.",
        "Cho rau vào xào lửa to, đảo đều tay.",
        "Nêm nước mắm, muối vừa ăn.",
        "Xào đến khi rau vừa chín tới, không mềm quá.",
      ],
      image_url: null,
    },
    {
      title: "Canh cải xanh nấu tôm",
      ingredients: ["cải xanh", "tôm tươi", "gừng", "nước mắm", "muối"],
      steps: [
        "Tôm rửa sạch, lột vỏ, giữ đuôi.",
        "Cải xanh tách lá, rửa sạch.",
        "Đun sôi nước, cho tôm vào trước.",
        "Tôm chín hồng, bỏ cải vào, nấu thêm 2 phút.",
        "Nêm gia vị vừa ăn, múc ra tô.",
      ],
      image_url: null,
    },
    {
      title: "Dưa leo trộn tôm khô",
      ingredients: ["dưa leo baby", "tôm khô", "tỏi", "ớt", "chanh", "đường", "nước mắm"],
      steps: [
        "Dưa leo rửa sạch, chẻ đôi hoặc thái lát.",
        "Tôm khô ngâm nước ấm 10 phút.",
        "Pha nước trộn: chanh, đường, nước mắm, tỏi, ớt.",
        "Trộn đều dưa leo và tôm khô với nước trộn.",
        "Để ngấm 10 phút trước khi ăn.",
      ],
      image_url: null,
    },
    {
      title: "Khổ qua nhồi thịt",
      ingredients: ["khổ qua", "thịt băm", "miến", "nấm mèo", "trứng", "nước mắm", "tiêu"],
      steps: [
        "Khổ qua cắt khoanh, bỏ ruột.",
        "Miến và nấm mèo ngâm nở, thái nhỏ.",
        "Trộn thịt, miến, nấm, trứng, gia vị.",
        "Nhồi hỗn hợp thịt vào khúc khổ qua.",
        "Hấp hoặc kho nhỏ lửa 20–25 phút.",
      ],
      image_url: null,
    },
  ]);

  console.log("Seed completed!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
