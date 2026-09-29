/**
 * Admin sections: which table, which columns to show, which fields may be edited/created.
 * Shared by the admin pages (rendering) and the admin API (whitelisting).
 */
export type FieldType = "text" | "textarea" | "number" | "decimal" | "boolean" | "select" | "day" | "list";
export interface Field { key: string; label: string; type: FieldType; options?: { value: string; label: string }[]; required?: boolean; min?: number }
export type AdminTableName = "users" | "clusters" | "farms" | "produce" | "farm_capacity" | "boxes" | "box_items" | "orders" | "subscriptions" | "group_orders" | "harvest_commands";
export interface Section {
  key: string;
  table: AdminTableName;
  label: string;
  icon: string;
  desc: string;
  fields: Field[];         // editable
  createFields?: Field[];  // creatable (defaults to fields)
  canDelete: boolean;
}

export const ORDER_STATUSES = [
  { value: "placed", label: "Đã vào sổ" },
  { value: "harvesting", label: "Đang thu hoạch" },
  { value: "loaded", label: "Trên xe lạnh" },
  { value: "delivered", label: "Đã tới sảnh" },
  { value: "cancelled", label: "Đã huỷ" },
];
export const GROUP_STATUSES = [
  { value: "open", label: "Đang mở" },
  { value: "locked", label: "Đã chốt" },
  { value: "delivered", label: "Đã giao" },
  { value: "cancelled", label: "Đã huỷ" },
];
export const FREQUENCIES = [{ value: "weekly", label: "Mỗi tuần" }, { value: "biweekly", label: "Hai tuần" }, { value: "monthly", label: "Mỗi tháng" }];
export const SIZES = [{ value: "S", label: "Nhỏ (S)" }, { value: "M", label: "Vừa (M)" }, { value: "L", label: "Lớn (L)" }];
export const CATEGORIES = [{ value: "rau_la", label: "Rau lá" }, { value: "cu_qua", label: "Củ quả" }];

export const SECTIONS: Section[] = [
  {
    key: "orders", table: "orders", label: "Đơn hàng", icon: "package_2", desc: "Mọi hộp đã đặt", canDelete: true,
    fields: [
      { key: "status", label: "Trạng thái", type: "select", options: ORDER_STATUSES },
      { key: "quantity", label: "Số hộp", type: "number", min: 1 },
      { key: "delivery_date", label: "Ngày giao", type: "day" },
      { key: "address", label: "Toà · căn hộ", type: "text" },
      { key: "note", label: "Ghi chú", type: "textarea" },
      { key: "care_message", label: "Lời nhắn quan tâm", type: "textarea" },
    ],
    createFields: [],
  },
  {
    key: "boxes", table: "boxes", label: "Hộp rau", icon: "inventory_2", desc: "Menu theo mùa, giá, cỡ hộp", canDelete: true,
    fields: [
      { key: "name", label: "Tên hộp", type: "text", required: true },
      { key: "slug", label: "Slug (đường dẫn)", type: "text", required: true },
      { key: "mix", label: "Mã mix (các cỡ cùng mix dùng chung)", type: "text", required: true },
      { key: "mix_name", label: "Tên mix", type: "text", required: true },
      { key: "size", label: "Cỡ", type: "select", options: SIZES },
      { key: "weight_kg", label: "Khối lượng (kg)", type: "decimal", required: true, min: 0 },
      { key: "price", label: "Giá (₫)", type: "number", required: true, min: 0 },
      { key: "season", label: "Mùa", type: "text", required: true },
      { key: "servings", label: "Số người", type: "number", required: true, min: 1 },
      { key: "days", label: "Số ngày", type: "number", required: true, min: 1 },
      { key: "description", label: "Mô tả", type: "textarea" },
      { key: "image_url", label: "Ảnh (URL)", type: "text" },
      { key: "active", label: "Đang bán", type: "boolean" },
    ],
  },
  {
    key: "box_items", table: "box_items", label: "Thành phần hộp", icon: "scale", desc: "Mỗi hộp gồm bao nhiêu ký rau gì", canDelete: true,
    fields: [
      { key: "box_id", label: "Hộp", type: "text", required: true },
      { key: "produce_id", label: "Rau củ", type: "text", required: true },
      { key: "quantity_kg", label: "Số ký", type: "decimal", required: true, min: 0 },
    ],
  },
  {
    key: "produce", table: "produce", label: "Rau củ", icon: "eco", desc: "Danh mục nguyên liệu của các hộp", canDelete: true,
    fields: [
      { key: "name", label: "Tên", type: "text", required: true },
      { key: "category", label: "Loại", type: "select", options: CATEGORIES },
      { key: "image_url", label: "Ảnh (URL)", type: "text" },
    ],
  },
  {
    key: "farm_capacity", table: "farm_capacity", label: "Năng suất", icon: "speed", desc: "Mỗi nông hộ đăng ký cắt được bao nhiêu ký mỗi ngày", canDelete: true,
    fields: [
      { key: "farm_id", label: "Vườn", type: "text", required: true },
      { key: "produce_id", label: "Rau củ", type: "text", required: true },
      { key: "daily_kg", label: "Kg mỗi ngày", type: "number", required: true, min: 0 },
    ],
  },
  {
    key: "farms", table: "farms", label: "Nông hộ", icon: "potted_plant", desc: "Vườn đối tác và chủ vườn", canDelete: true,
    fields: [
      { key: "name", label: "Tên vườn", type: "text", required: true },
      { key: "slug", label: "Slug (đường dẫn)", type: "text", required: true },
      { key: "location", label: "Địa điểm (huyện, tỉnh)", type: "text", required: true },
      { key: "province", label: "Tỉnh", type: "text", required: true },
      { key: "description", label: "Mô tả", type: "textarea" },
      { key: "cover_url", label: "Ảnh bìa (URL)", type: "text" },
      { key: "owner_id", label: "Chủ vườn", type: "text", required: true },
    ],
  },
  {
    key: "harvest_commands", table: "harvest_commands", label: "Lệnh thu hoạch", icon: "sms", desc: "Tin nhắn đã gửi cho nông hộ", canDelete: false,
    fields: [
      { key: "status", label: "Xác nhận", type: "select", options: [{ value: "sent", label: "Chờ xác nhận" }, { value: "declined", label: "Không cắt được" }, { value: "confirmed", label: "Đã xác nhận" }] },
      { key: "message", label: "Nội dung", type: "textarea", required: true },
    ],
    createFields: [],
  },
  {
    key: "subscriptions", table: "subscriptions", label: "Gói định kỳ", icon: "event_repeat", desc: "Khách nhận hộp theo kỳ", canDelete: true,
    fields: [
      { key: "active", label: "Đang chạy", type: "boolean" },
      { key: "frequency", label: "Tần suất", type: "select", options: FREQUENCIES },
      { key: "quantity", label: "Số hộp", type: "number", min: 1 },
      { key: "next_delivery", label: "Hộp tiếp theo", type: "day" },
      { key: "care_message", label: "Lời nhắn quan tâm (để trống: chọn ngẫu nhiên mỗi kỳ)", type: "textarea" },
    ],
    createFields: [],
  },
  {
    key: "group_orders", table: "group_orders", label: "Gom đơn", icon: "groups", desc: "Nhóm mua chung theo chung cư", canDelete: true,
    fields: [
      { key: "title", label: "Tên nhóm", type: "text", required: true },
      { key: "status", label: "Trạng thái", type: "select", options: GROUP_STATUSES },
      { key: "min_members", label: "Số nhà tối thiểu", type: "number", min: 1 },
      { key: "delivery_date", label: "Ngày giao", type: "day" },
    ],
    createFields: [],
  },
  {
    key: "clusters", table: "clusters", label: "Chung cư", icon: "apartment", desc: "Cụm chung cư nhận hàng tại Hà Nội", canDelete: true,
    fields: [
      { key: "name", label: "Tên", type: "text", required: true },
      { key: "address", label: "Địa chỉ", type: "text", required: true },
      { key: "district", label: "Quận", type: "text", required: true },
    ],
  },
  {
    key: "users", table: "users", label: "Người dùng", icon: "group", desc: "Khách hàng và nhà vườn", canDelete: true,
    fields: [
      { key: "gender", label: "Giới tính (quyết định xưng hô mặc định)", type: "select", options: [{ value: "", label: "Chưa rõ" }, { value: "female", label: "Nữ" }, { value: "male", label: "Nam" }] },
      { key: "salutation", label: "Xưng hô tự chọn (để trống = theo giới tính)", type: "text" },
      { key: "short_name", label: "Tên gọi (Ba, Lan…)", type: "text" },
      { key: "name", label: "Tên", type: "text", required: true },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Điện thoại", type: "text" },
      { key: "role", label: "Vai trò", type: "select", options: [{ value: "customer", label: "Khách hàng" }, { value: "farmer", label: "Nhà vườn" }] },
      { key: "cluster_id", label: "Chung cư", type: "text" },
      { key: "address", label: "Toà · căn hộ", type: "text" },
    ],
  },
];

export const sectionByKey = (k: string) => SECTIONS.find((s) => s.key === k);
