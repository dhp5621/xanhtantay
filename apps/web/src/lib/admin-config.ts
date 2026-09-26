/**
 * Admin sections: which table, which columns to show, which fields may be edited/created.
 * Shared by the admin pages (rendering) and the admin API (whitelisting).
 */
export type FieldType = "text" | "textarea" | "number" | "boolean" | "select" | "date" | "list";
export interface Field { key: string; label: string; type: FieldType; options?: { value: string; label: string }[]; required?: boolean; min?: number }
export interface Section {
  key: string;
  table: "users" | "farms" | "products" | "orders" | "subscriptions" | "group_orders" | "farm_diary" | "recipes" | "user_recipes" | "meal_plans";
  label: string;
  icon: string;
  desc: string;
  fields: Field[];         // editable
  createFields?: Field[];  // creatable (defaults to fields)
  canDelete: boolean;
}

export const ORDER_STATUSES = [
  { value: "harvesting", label: "Đang thu hoạch" },
  { value: "loaded", label: "Đã lên xe" },
  { value: "delivered", label: "Đã giao" },
];
export const GROUP_STATUSES = [
  { value: "open", label: "Đang mở" },
  { value: "locked", label: "Đã chốt" },
  { value: "delivered", label: "Đã giao" },
  { value: "cancelled", label: "Đã huỷ" },
];
export const CATEGORIES = [
  { value: "rau_la", label: "Rau lá" },
  { value: "cu_qua", label: "Củ quả" },
  { value: "rau_thom", label: "Rau thơm" },
  { value: "rau_mam", label: "Rau mầm" },
];

export const SECTIONS: Section[] = [
  {
    key: "users", table: "users", label: "Người dùng", icon: "group", desc: "Khách hàng và nhà vườn", canDelete: true,
    fields: [
      { key: "name", label: "Tên", type: "text", required: true },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Điện thoại", type: "text" },
      { key: "role", label: "Vai trò", type: "select", options: [{ value: "customer", label: "Khách hàng" }, { value: "farmer", label: "Nhà vườn" }] },
    ],
  },
  {
    key: "farms", table: "farms", label: "Vườn", icon: "potted_plant", desc: "Trang trại và chủ vườn", canDelete: true,
    fields: [
      { key: "name", label: "Tên vườn", type: "text", required: true },
      { key: "slug", label: "Slug (đường dẫn)", type: "text", required: true },
      { key: "location", label: "Địa điểm", type: "text", required: true },
      { key: "description", label: "Mô tả", type: "textarea" },
      { key: "cover_url", label: "Ảnh bìa (URL)", type: "text" },
      { key: "owner_id", label: "ID chủ vườn (user)", type: "text", required: true },
    ],
  },
  {
    key: "products", table: "products", label: "Sản phẩm", icon: "eco", desc: "Giá, tồn kho, phân loại", canDelete: true,
    fields: [
      { key: "name", label: "Tên", type: "text", required: true },
      { key: "farm_id", label: "ID vườn", type: "text", required: true },
      { key: "unit", label: "Đơn vị", type: "text", required: true },
      { key: "price_per_unit", label: "Giá (₫)", type: "number", required: true, min: 0 },
      { key: "stock_qty", label: "Tồn kho", type: "number", required: true, min: 0 },
      { key: "in_stock", label: "Đang bán", type: "boolean" },
      { key: "category", label: "Phân loại", type: "select", options: CATEGORIES },
    ],
  },
  {
    key: "orders", table: "orders", label: "Đơn hàng", icon: "package_2", desc: "Mọi đơn của mọi vườn", canDelete: true,
    fields: [
      { key: "status", label: "Trạng thái", type: "select", options: ORDER_STATUSES },
      { key: "delivery_mode", label: "Giao", type: "select", options: [{ value: "direct", label: "Giao riêng" }, { value: "pooled", label: "Ghép chuyến" }] },
      { key: "total", label: "Tổng (₫)", type: "number", min: 0 },
      { key: "note", label: "Ghi chú", type: "textarea" },
    ],
    createFields: [],
  },
  {
    key: "subscriptions", table: "subscriptions", label: "Gói đăng ký", icon: "event_repeat", desc: "Giao định kỳ", canDelete: true,
    fields: [
      { key: "active", label: "Đang hoạt động", type: "boolean" },
      { key: "frequency", label: "Tần suất", type: "select", options: [{ value: "weekly", label: "Mỗi tuần" }, { value: "monthly", label: "Mỗi tháng" }] },
      { key: "next_delivery", label: "Giao tiếp theo", type: "date" },
    ],
    createFields: [],
  },
  {
    key: "group_orders", table: "group_orders", label: "Gom đơn", icon: "groups", desc: "Nhóm mua chung", canDelete: true,
    fields: [
      { key: "title", label: "Tên nhóm", type: "text", required: true },
      { key: "status", label: "Trạng thái", type: "select", options: GROUP_STATUSES },
      { key: "min_members", label: "Tối thiểu", type: "number", min: 1 },
      { key: "current_members", label: "Hiện có", type: "number", min: 0 },
      { key: "deadline", label: "Hạn chốt", type: "date" },
      { key: "shipping_address", label: "Địa chỉ nhận", type: "text" },
    ],
    createFields: [],
  },
  {
    key: "diary", table: "farm_diary", label: "Nhật ký", icon: "auto_stories", desc: "Bài đăng từ vườn", canDelete: true,
    fields: [
      { key: "content", label: "Nội dung", type: "textarea", required: true },
      { key: "media_urls", label: "Ảnh / video (mỗi dòng một URL)", type: "list" },
    ],
    createFields: [],
  },
  {
    key: "user_recipes", table: "user_recipes", label: "Món AI của khách", icon: "auto_awesome", desc: "Công thức AI đã gợi ý cho từng khách", canDelete: true,
    fields: [{ key: "title", label: "Tên món", type: "text", required: true }],
    createFields: [],
  },
  {
    key: "meal_plans", table: "meal_plans", label: "Kế hoạch ăn", icon: "calendar_month", desc: "Lịch nấu AI theo từng đơn đã giao", canDelete: true,
    fields: [{ key: "summary", label: "Tóm tắt", type: "textarea" }],
    createFields: [],
  },
  {
    key: "recipes", table: "recipes", label: "Công thức mẫu", icon: "skillet", desc: "Dự phòng khi chưa bật AI", canDelete: true,
    fields: [
      { key: "title", label: "Tên món", type: "text", required: true },
      { key: "ingredients", label: "Nguyên liệu (mỗi dòng một)", type: "list" },
      { key: "steps", label: "Các bước (mỗi dòng một)", type: "list" },
      { key: "image_url", label: "Ảnh (URL)", type: "text" },
    ],
  },
];

export const sectionByKey = (k: string) => SECTIONS.find((s) => s.key === k);
