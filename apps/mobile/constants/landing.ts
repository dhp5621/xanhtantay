// Copy mirrors apps/web/src/components/landing/Landing.tsx and the signed-in home page (same icon names).
export const PILLAR_TONES = ["primary", "tertiary", "secondary", "primary"] as const;

export const PILLARS = [
  {
    icon: "verified",
    eyebrow: "Minh bạch nguồn gốc",
    title: "Thấy vườn trước khi thấy rau",
    items: [
      { icon: "auto_stories", t: "Nhật ký nông trại", d: "Ảnh, video ngắn mỗi ngày từ vườn: gieo hạt, tưới nước, thu hoạch.", more: "Mỗi bài có giờ đăng chính xác. Bạn thấy luống rau mình sắp ăn lớn lên từng ngày, và biết ai đang chăm nó. Video giới hạn 30 giây để xem nhanh, tải nhẹ." },
      { icon: "videocam", t: "Livestream tại vườn", d: "Xem bác nông dân thu hoạch trực tiếp và chốt đơn ngay trên phiên live.", more: "Theo dõi vườn để nhận thông báo khi lên sóng. Trong phiên live, món đang hái hiện ngay dưới màn hình để bạn thêm vào giỏ mà không rời khỏi video. (Sắp ra mắt)" },
    ],
  },
  {
    icon: "shopping_cart_checkout",
    eyebrow: "Đặt hàng thông minh",
    title: "Mua theo cách hợp với nhà bạn",
    items: [
      { icon: "event_repeat", t: "Hộp rau gia đình định kỳ", d: "Một mức giá cố định mỗi tuần hoặc mỗi tháng, tự lên đơn, đổi món linh hoạt trước ngày giao 24h.", more: "Chọn món một lần từ trang vườn rồi bấm “Giao định kỳ”. Hệ thống tự lên đơn mỗi kỳ và trừ tồn kho của vườn. Tạm dừng, bật lại hay đổi món bất cứ lúc nào trong mục Gói đăng ký." },
      { icon: "groups", t: "Gom đơn chung", d: "Rủ hàng xóm cùng toà nhà mua chung một chuyến xe để chia phí gom. Đủ nhóm là miễn phí ship.", more: "Tạo nhóm, đặt số người tối thiểu và hạn chốt, chia link mời. Thanh tiến độ hiện ngay cần thêm mấy người. Đủ người trước hạn là cả nhóm được miễn phí vận chuyển về một điểm nhận chung." },
    ],
  },
  {
    icon: "favorite",
    eyebrow: "Theo dõi có cảm xúc",
    title: "Không còn “đang giao” khô khan",
    items: [
      { icon: "agriculture", t: "Rau đang được nhà vườn thu hoạch", d: "", more: "Bước 1. Nhà vườn nhận đơn và hái đúng phần của bạn vào sáng hôm giao. Rau chưa bao giờ nằm kho." },
      { icon: "local_shipping", t: "Hàng đã lên xe lạnh về phố", d: "", more: "Bước 2. Nhà vườn bấm một nút khi xe lạnh rời vườn. Bạn thấy trạng thái đổi ngay trong mục Đơn hàng." },
      { icon: "home", t: "Đồ quê đã đến tận cửa nhà bạn", d: "", more: "Bước 3. Giao tận cửa, thanh toán khi nhận. Từ đây app gợi ý luôn hôm nay nấu gì với những món vừa về." },
    ],
  },
  {
    icon: "skillet",
    eyebrow: "Tiện ích bếp núc",
    title: "Mua gì, gợi ý nấu nấy",
    items: [
      { icon: "auto_awesome", t: "Gợi ý mâm cơm bằng AI", d: "Mua bí đỏ và thịt băm, trợ lý gợi ý ngay canh bí đỏ thịt băm với công thức từng bước.", more: "AI nấu riêng cho từng khách từ đúng những món trong đơn đã đặt. Không ưng thì bấm “đổi món khác”, không bao giờ lặp lại. Mọi gợi ý lưu vào lịch sử để bạn xem lại bất cứ lúc nào." },
    ],
  },
];

export const FARMER_POINTS = [
  { icon: "storefront", t: "Bán thẳng cho người ăn", d: "Thay 3–5 khâu trung gian bằng một nền tảng. Bạn tự đặt giá bán; Xanh Tận Tay chỉ thu 5–10% trên mỗi đơn giao thành công.", more: "Ví dụ: bó cải bạn bán 8.000₫, khách trả 8.000₫ cộng phí vận chuyển gom. Nền tảng giữ lại tối đa 800₫, phần còn lại về bạn khi đơn giao xong. Đơn huỷ hoặc không giao được thì không mất phí." },
  { icon: "photo_camera", t: "Đăng bán theo đợt thu hoạch", d: "Có gì bán nấy, hái theo đơn đã chốt. Không tồn kho, không hao hụt.", more: "Mỗi sản phẩm có số lượng còn bán. Khách đặt là tự trừ, về 0 là tự ẩn “hết hàng”. Nhập lại số lượng khi có lứa mới, bấm một nút là mở bán lại." },
  { icon: "mic", t: "Đơn giản như nói chuyện", d: "Đăng nhật ký bằng ảnh, sắp tới bằng giọng nói. Không cần rành công nghệ.", more: "Chụp ảnh thẳng từ camera, chọn một câu gợi ý sẵn, bấm đăng. Ảnh và video tự nén trên điện thoại nên mạng yếu vẫn đăng được. Nhập bằng giọng nói đang được phát triển." },
  { icon: "event_repeat", t: "Đầu ra ổn định", d: "Khách đăng ký “hộp rau gia đình” tuần / tháng nghĩa là đơn đều, dễ lên kế hoạch gieo trồng.", more: "Mục Khách đăng ký cho bạn thấy ai nhận rau kỳ tới, món gì, bao nhiêu. Nhìn vào đó để biết tuần sau cần hái gì, tháng sau nên gieo gì." },
];

export const DAY_STEPS = [
  { icon: "wb_twilight", time: "05:30", t: "Ra vườn, chụp một tấm ảnh", d: "Sương còn đọng trên lá. 30 giây trên điện thoại, khách thấy ngay." },
  { icon: "photo_camera", time: "06:00", t: "Đăng nhật ký", d: "Kể hôm nay hái gì, cây nào đang lớn. Khách tin hơn mỗi ngày." },
  { icon: "notifications_active", time: "07:00", t: "Đơn về", d: "Đơn lẻ, đơn gói, đơn gom của cả toà nhà, gom lại thành một danh sách hái." },
  { icon: "agriculture", time: "08:00", t: "Hái theo đơn đã chốt", d: "Không thừa, không thiếu, không tồn kho. Tồn kho tự trừ theo đơn." },
  { icon: "local_shipping", time: "11:00", t: "Bấm “đã lên xe”", d: "Xe lạnh về phố. Khách nhận thông báo “hàng đã lên xe lạnh về phố”." },
  { icon: "payments", time: "17:00", t: "Bấm “đã giao”, tiền về", d: "Khách trả khi nhận. Cuối ngày xem tổng doanh thu trên trang tổng quan." },
];

export const FEES = [
  { icon: "percent", who: "Nhà vườn", t: "5–10% mỗi đơn thành công", d: "Không phí đăng bán, không phí tháng. Đơn không giao được thì không thu." },
  { icon: "package_2", who: "Người mua", t: "Phí đóng gói & vận chuyển gom", d: "Tính theo chuyến xe gom. Gom đơn đủ nhóm là được miễn." },
  { icon: "event_repeat", who: "Người mua", t: "Hộp rau gia đình giá cố định", d: "Gói tuần / tháng một mức giá, giao đúng hẹn, đổi món trước 24h." },
];

export const HOME_FEATURES = [
  { icon: "visibility", title: "Thấy tận gốc", text: "Nhật ký canh tác mỗi ngày từ chính bác nông dân." },
  { icon: "local_shipping", title: "Tươi trong ngày", text: "Thu hoạch sáng, xe lạnh về phố, giao chiều." },
  { icon: "groups", title: "Gom đơn freeship", text: "Rủ hàng xóm cùng mua, đủ nhóm là miễn ship." },
];
