/** Ready-made notifications for testing every kind the app sends. Shared by the admin card and its API. */
export interface PushTemplate { key: string; label: string; icon: string; title: string; body: string; url: string; hint: string }

export const PUSH_TEMPLATES: PushTemplate[] = [
  { key: "harvest_command", label: "Lệnh thu hoạch (Đồng ý / Không đồng ý)", icon: "agriculture", title: "Lệnh thu hoạch mới", body: "Nội dung lấy từ lệnh mới nhất của nông hộ demo.", url: "/farmer", hint: "Đặt lệnh mới nhất của nông hộ demo về \"Chờ xác nhận\" rồi gửi kèm hai nút Có / Không. Bấm nút chỉ có tác dụng khi máy đang đăng nhập bằng tài khoản nông dân demo." },
  { key: "order_placed", label: "Đơn mới vào sổ", icon: "inventory", title: "Đơn đã vào sổ", body: "Bạn ơi, đơn của bạn đã vào sổ rồi ạ. 18h00 chốt sổ, mai rau sẽ có tại sảnh. Cảm ơn bạn đã đặt rau!", url: "/don-hang", hint: "Khách vừa đặt hộp." },
  { key: "order_harvesting", label: "Đang thu hoạch", icon: "agriculture", title: "Hộp rau của bạn", body: "Bạn ơi, 4h00 sáng nay rau của bạn đang được bác nông dân thu hoạch ạ.", url: "/don-hang", hint: "Chuyến chuyển sang thu hoạch." },
  { key: "order_loaded", label: "Lên xe lạnh", icon: "local_shipping", title: "Hộp rau của bạn", body: "Bạn ơi, 6h00 hộp rau của bạn đã lên xe lạnh về phố rồi ạ.", url: "/don-hang", hint: "Chuyến đã lên xe." },
  { key: "order_delivered", label: "Đã tới sảnh", icon: "apartment", title: "Hộp rau của bạn", body: "Bạn ơi, rau quê đã có tại sảnh chung cư nhà bạn rồi ạ. Chúc cả nhà ngon miệng!", url: "/don-hang", hint: "Hộp đã tới sảnh." },
  { key: "cutoff_reminder", label: "Nhắc chốt sổ", icon: "schedule", title: "Còn 1 giờ nữa chốt sổ", body: "Bạn ơi, còn 1 giờ nữa là chốt sổ ạ. Đặt trước 18h00 để mai có rau tại sảnh nhé.", url: "/hop-rau", hint: "Mở trang hộp rau." },
  { key: "group_full", label: "Nhóm đã đủ nhà", icon: "groups", title: "Nhóm gom đơn đã đủ", body: "Bạn ơi, nhóm của bạn đã đủ số nhà rồi ạ. Cả nhóm được miễn phí giao.", url: "/gom-don", hint: "Mở trang gom đơn." },
  { key: "new_menu", label: "Thực đơn mới", icon: "menu_book", title: "Thực đơn tuần này", body: "Bạn ơi, hộp rau của bạn có kèm thực đơn 7 ngày ạ. Chưa ưng món nào, bạn đổi món đó nhé.", url: "/don-hang", hint: "Mở đơn hàng." },
];
