export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** exact match only (used for "/") */
  exact?: boolean;
}

/** Signed-out visitors see only Home (plus the login button). */
export const VISITOR_NAV: NavItem[] = [
  { href: "/", label: "Trang chủ", icon: "home", exact: true },
];

export const CUSTOMER_NAV: NavItem[] = [
  { href: "/", label: "Trang chủ", icon: "home", exact: true },
  { href: "/farms", label: "Vườn rau", icon: "potted_plant" },
  { href: "/gom-don", label: "Gom đơn", icon: "groups" },
  { href: "/cong-thuc", label: "Công thức", icon: "skillet" },
];

export const CUSTOMER_MOBILE_NAV: NavItem[] = [
  ...CUSTOMER_NAV,
  { href: "/tai-khoan", label: "Tài khoản", icon: "account_circle" },
];

export const FARMER_NAV: NavItem[] = [
  { href: "/farmer", label: "Tổng quan", icon: "dashboard", exact: true },
  { href: "/farmer/don-hang", label: "Đơn hàng", icon: "package_2" },
  { href: "/farmer/san-pham", label: "Sản phẩm", icon: "eco" },
  { href: "/farmer/dang-ky", label: "Đăng ký", icon: "event_repeat" },
  { href: "/farmer/nhat-ky", label: "Nhật ký", icon: "photo_camera" },
];

export function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
