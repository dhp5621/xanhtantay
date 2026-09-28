// Visitor landing copy for the pre-order model (icon names are Material Symbols, as everywhere else).
export const TONES = ["primary", "tertiary", "secondary"] as const;
export type LandingTone = (typeof TONES)[number];

/** The four clock times the whole product runs on. */
export const MODEL_STEPS = [
  { icon: "schedule", time: "18h00", t: "Đặt trước 18h", d: "Bạn chọn hộp rau trước giờ chốt sổ mỗi ngày. Đặt hôm nay, chiều mai nhận." },
  { icon: "hub", time: "18h05", t: "Bộ não gom nhu cầu", d: "Hệ thống cộng tất cả đơn của các toà nhà, chia đúng theo sức trồng của từng vườn." },
  { icon: "agriculture", time: "4h00", t: "Bác nông dân cắt đúng lượng", d: "Mỗi bác nhận một lệnh thu hoạch duy nhất, cắt vừa đủ số ký đã có người đặt." },
  { icon: "apartment", time: "16h00", t: "Tới sảnh chung cư", d: "Xe lạnh rời vườn lúc 6h, hộp rau có mặt ở sảnh toà nhà bạn lúc 16h." },
];

export const BENEFITS = [
  { icon: "inventory_2", t: "Hộp theo mùa", d: "Ba cỡ hộp nhỏ, vừa, lớn. Rau trong hộp đổi theo mùa, phối từ nhiều vườn.", more: "Mỗi hộp ghi rõ từng loại rau bao nhiêu ký và vườn nào trồng. Bạn không phải chọn từng mớ, chỉ cần chọn cỡ hộp hợp với nhà mình." },
  { icon: "event_repeat", t: "Gói định kỳ", d: "Tự lên đơn mỗi tuần, hai tuần hoặc mỗi tháng. Miễn phí giao.", more: "Đổi số hộp, đổi tần suất hay tạm dừng bất cứ lúc nào trong mục Gói định kỳ. Nhà vườn biết trước nhu cầu nên gieo trồng vừa đủ." },
  { icon: "groups", t: "Gom đơn chung cư", d: "Rủ hàng xóm cùng toà đặt chung một chuyến. Đủ người là miễn phí giao.", more: "Mỗi nhóm gắn với một cụm chung cư và một ngày giao. Thanh tiến độ cho biết còn thiếu mấy nhà. Đủ số lúc chốt sổ 18h00, phí giao của cả nhóm về 0." },
  { icon: "favorite", t: "Theo dõi có giờ", d: "4h00 rau đang được cắt, 6h00 lên xe lạnh, 16h00 có mặt tại sảnh.", more: "Không còn dòng “đang giao” khô khan. Mỗi chặng có giờ cụ thể và tên bác nông dân đang thu hoạch phần rau của bạn." },
  { icon: "qr_code_2", t: "QR truy xuất", d: "Quét mã trên hộp để biết rau từ vườn nào, cắt lúc mấy giờ.", more: "Trang truy xuất hiện vườn trồng, giờ thu hoạch, hành trình xe lạnh và từng loại rau trong hộp. Không hiện thông tin người mua." },
  { icon: "menu_book", t: "Thực đơn theo ngày kèm hộp", d: "Mỗi hộp có sẵn thực đơn bữa trưa, bữa tối cho từng ngày, kèm cách làm.", more: "Thực đơn được soạn theo đúng rau trong hộp, có nguyên liệu và các bước nấu. Mở hộp ra là biết hôm nay nấu gì, không lo rau thừa trong tủ lạnh." },
  { icon: "mail", t: "Lời nhắn quan tâm", d: "Mỗi đơn kèm một lời nhắn từ quê, như mẹ gửi rau lên phố.", more: "Lời nhắn hiện ngay sau khi đặt và nằm trong chi tiết đơn, nhắc bạn cách bảo quản, món nên nấu trước và một lời hỏi thăm." },
];

export const FARMER_POINTS = [
  { icon: "sms", t: "Chỉ một tin nhắn mỗi ngày", d: "18h00 hệ thống gửi đúng một lệnh thu hoạch cho sáng hôm sau, viết thành một câu dễ đọc." },
  { icon: "touch_app", t: "Một nút xác nhận", d: "Đọc xong bấm “Đã hiểu & Xác nhận”. Không cần đăng bài, không cần quản lý kho." },
  { icon: "eco", t: "Cắt đúng lượng, rau thừa 0%", d: "Lệnh được tính theo sức trồng bác đã đăng ký, nên cắt bao nhiêu là có người ăn bấy nhiêu." },
];
