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
  { href: "/hop-rau", label: "Hộp rau", icon: "inventory_2" },
  { href: "/gom-don", label: "Gom đơn", icon: "groups" },
  { href: "/dinh-ky", label: "Định kỳ", icon: "event_repeat" },
  { href: "/don-hang", label: "Đơn hàng", icon: "package_2" },
];

export const CUSTOMER_MOBILE_NAV: NavItem[] = [
  { href: "/", label: "Trang chủ", icon: "home", exact: true },
  { href: "/hop-rau", label: "Hộp rau", icon: "inventory_2" },
  { href: "/gom-don", label: "Gom đơn", icon: "groups" },
  { href: "/don-hang", label: "Đơn hàng", icon: "package_2" },
  { href: "/tai-khoan", label: "Tài khoản", icon: "account_circle" },
];

/** Farmers get exactly one screen. */
export const FARMER_NAV: NavItem[] = [
  { href: "/farmer", label: "Lệnh thu hoạch", icon: "agriculture", exact: true },
];

export const FARMER_MOBILE_NAV: NavItem[] = [
  { href: "/farmer", label: "Lệnh thu hoạch", icon: "agriculture", exact: true },
  { href: "/tai-khoan", label: "Tài khoản", icon: "account_circle" },
];

export function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
