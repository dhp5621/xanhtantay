// Visitor landing copy for the pre-order model (icon names are Material Symbols, as everywhere else).
export const TONES = ["primary", "tertiary", "secondary"] as const;
export type LandingTone = (typeof TONES)[number];

/** The four clock times the whole product runs on. */
export const MODEL_STEPS = [
  { icon: "schedule", time: "18h00", t: "Đặt trước 18h", d: "Rau giao thứ Tư và Chủ nhật. Bạn chọn hộp rau trước 18h00 hôm trước ngày giao." },
  { icon: "hub", time: "18h05", t: "Bộ não gom nhu cầu", d: "Hệ thống cộng tất cả đơn của các điểm nhận, chia đúng theo sức trồng của từng vườn." },
  { icon: "agriculture", time: "4h00", t: "Bác nông dân cắt đúng lượng", d: "Mỗi bác nhận một lệnh thu hoạch duy nhất, cắt vừa đủ số ký đã có người đặt." },
  { icon: "apartment", time: "16h00", t: "Tới điểm nhận", d: "Xe lạnh rời vườn lúc 6h, hộp rau có mặt ở ký túc xá, khu trọ của bạn lúc 16h." },
];

export const BENEFITS = [
  { icon: "inventory_2", t: "Hộp theo mùa", d: "Mỗi mùa có ba mix rau, mỗi mix có size S, M, L. Hộp nào cũng đủ ăn 7 ngày.", more: "Size S 3 kg cho 1 người, size M 6 kg cho 2 người, size L 12 kg cho phòng 3–4 người; giá đồng nhất 190.000₫, 320.000₫, 520.000₫. Mỗi hộp ghi rõ từng loại rau bao nhiêu ký, vườn nào trồng và cách bảo quản. Bạn không phải chọn từng mớ, chỉ cần chọn mix rồi chọn size hợp với phòng mình." },
  { icon: "event_repeat", t: "Gói định kỳ", d: "Tự lên đơn mỗi tuần, hai tuần hoặc mỗi tháng, giao thứ Tư hoặc Chủ nhật.", more: "Đổi số hộp, đổi tần suất, dời ngày giao hay tạm dừng trong mục Gói định kỳ. Trả trước bằng chuyển khoản, phí giao theo size: S 15.000₫, M 20.000₫, L 30.000₫ mỗi hộp. Nhà vườn biết trước nhu cầu nên gieo trồng vừa đủ." },
  { icon: "groups", t: "Gom đơn cùng khu", d: "Rủ bạn cùng phòng, cùng ký túc xá hay khu trọ đặt chung một chuyến. Đủ người là miễn phí giao.", more: "Mỗi nhóm gắn với một điểm nhận và một ngày giao. Thanh tiến độ cho biết còn thiếu mấy người. Đủ số lúc chốt sổ 18h00, phí giao của cả nhóm về 0." },
  { icon: "favorite", t: "Theo dõi có giờ", d: "4h00 rau đang được cắt, 6h00 lên xe lạnh, 16h00 có mặt tại điểm nhận.", more: "Không còn dòng “đang giao” khô khan. Mỗi chặng có giờ cụ thể và tên bác nông dân đang thu hoạch phần rau của bạn." },
  { icon: "qr_code_2", t: "QR truy xuất", d: "Quét mã trên hộp để biết rau từ vườn nào, cắt lúc mấy giờ.", more: "Trang truy xuất hiện vườn trồng, giờ thu hoạch, hành trình xe lạnh và từng loại rau trong hộp. Không hiện thông tin người mua." },
  { icon: "menu_book", t: "Thực đơn theo ngày kèm hộp", d: "Mỗi hộp có sẵn thực đơn 7 ngày, bữa trưa và bữa tối, kèm cách làm.", more: "Thực đơn được soạn theo đúng rau trong hộp, có nguyên liệu và các bước nấu. Mở hộp ra là biết hôm nay nấu gì, không lo rau thừa trong tủ lạnh." },
  { icon: "mail", t: "Lời nhắn quan tâm", d: "Mỗi đơn kèm một lời nhắn từ quê, như mẹ gửi rau lên phố.", more: "Lời nhắn hiện ngay sau khi đặt và nằm trong chi tiết đơn, nhắc bạn cách bảo quản, món nên nấu trước và một lời hỏi thăm." },
];

export const FARMER_POINTS = [
  { icon: "sms", t: "Chỉ một tin nhắn mỗi chuyến", d: "18h00 hôm trước ngày giao (thứ Ba, thứ Bảy) hệ thống gửi đúng một lệnh thu hoạch cho sáng hôm sau, viết thành một câu dễ đọc." },
  { icon: "touch_app", t: "Một nút xác nhận", d: "Đọc xong bấm “Đã hiểu & Xác nhận”. Không cần đăng bài, không cần quản lý kho." },
  { icon: "eco", t: "Cắt đúng lượng, rau thừa 0%", d: "Lệnh được tính theo sức trồng bác đã đăng ký, nên cắt bao nhiêu là có người ăn bấy nhiêu." },
];
