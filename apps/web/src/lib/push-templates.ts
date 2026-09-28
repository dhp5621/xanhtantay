/** Ready-made notifications for testing every kind the app sends. Shared by the admin card and its API. */
export interface PushTemplate { key: string; label: string; icon: string; title: string; body: string; url: string; hint: string }

export const PUSH_TEMPLATES: PushTemplate[] = [
  { key: "harvest_command", label: "Lệnh thu hoạch (Có / Không)", icon: "agriculture", title: "Lệnh thu hoạch mới", body: "Nội dung lấy từ lệnh mới nhất của nông hộ demo.", url: "/farmer", hint: "Đặt lệnh mới nhất của nông hộ demo về \"Chờ xác nhận\" rồi gửi kèm hai nút Có / Không. Bấm nút chỉ có tác dụng khi máy đang đăng nhập bằng tài khoản nông dân demo." },
  { key: "order_placed", label: "Đơn mới vào sổ", icon: "inventory", title: "Đơn đã vào sổ", body: "Hộp rau của bạn đã vào sổ. 18h00 chốt sổ, mai có tại sảnh.", url: "/don-hang", hint: "Khách vừa đặt hộp." },
  { key: "order_harvesting", label: "Đang thu hoạch", icon: "agriculture", title: "Hộp rau của bạn", body: "4h00: Rau đang được bác nông dân thu hoạch", url: "/don-hang", hint: "Chuyến chuyển sang thu hoạch." },
  { key: "order_loaded", label: "Lên xe lạnh", icon: "local_shipping", title: "Hộp rau của bạn", body: "6h00: Hàng lên xe lạnh về phố", url: "/don-hang", hint: "Chuyến đã lên xe." },
  { key: "order_delivered", label: "Đã tới sảnh", icon: "apartment", title: "Hộp rau của bạn", body: "16h00: Rau quê đã có tại sảnh chung cư nhà bạn", url: "/don-hang", hint: "Hộp đã tới sảnh." },
  { key: "cutoff_reminder", label: "Nhắc chốt sổ", icon: "schedule", title: "Còn 1 giờ nữa chốt sổ", body: "Đặt trước 18h00 để mai có rau tại sảnh.", url: "/hop-rau", hint: "Mở trang hộp rau." },
  { key: "group_full", label: "Nhóm đã đủ nhà", icon: "groups", title: "Nhóm gom đơn đã đủ", body: "Nhóm của bạn đã đủ số nhà, cả nhóm được miễn phí giao.", url: "/gom-don", hint: "Mở trang gom đơn." },
  { key: "new_menu", label: "Thực đơn mới", icon: "menu_book", title: "Thực đơn tuần này", body: "Hộp rau của bạn có thực đơn 7 ngày. Chán món nào thì đổi món đó.", url: "/don-hang", hint: "Mở đơn hàng." },
];
