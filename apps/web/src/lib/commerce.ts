/** Business rules shared by the cart, order API and account pages. */

/** Orders below this ship "pooled": combined with neighbours' orders on the next shared trip. */
export const MIN_DIRECT_ORDER = 100_000;
/** Farmer keeps this share of the order value (platform commission 5–10%, we show the midpoint). */
export const FARMER_SHARE = 0.925;
/** Loyalty: 1 point per 1,000₫ of delivered orders. */
export const POINTS_PER_1000 = 1;

export const pointsFor = (totalVnd: number) => Math.floor(totalVnd / 1000) * POINTS_PER_1000;

export interface Level { name: string; icon: string; min: number; stage: number; desc: string }
export const LEVELS: Level[] = [
  { name: "Hạt mầm", icon: "spa", min: 0, stage: 0, desc: "Bắt đầu gieo" },
  { name: "Mầm non", icon: "grass", min: 100, stage: 1, desc: "Đã nhú lá đầu" },
  { name: "Cây non", icon: "potted_plant", min: 300, stage: 2, desc: "Vươn cao mỗi tuần" },
  { name: "Cây xanh", icon: "park", min: 700, stage: 3, desc: "Đã cho bóng mát" },
  { name: "Cây ra hoa", icon: "local_florist", min: 1100, stage: 4, desc: "Ong bướm ghé thăm" },
  { name: "Cây trĩu quả", icon: "nutrition", min: 1500, stage: 5, desc: "Mùa nào cũng có quả" },
  { name: "Cổ thụ", icon: "forest", min: 3000, stage: 6, desc: "Chim về làm tổ" },
  { name: "Vườn nhỏ", icon: "yard", min: 5000, stage: 7, desc: "Thêm cây bên cạnh" },
  { name: "Vườn xanh", icon: "nature", min: 8000, stage: 8, desc: "Cả hàng cây xanh" },
  { name: "Trang trại", icon: "agriculture", min: 12000, stage: 9, desc: "Nuôi cả xóm" },
  { name: "Đồi rau", icon: "landscape", min: 17000, stage: 10, desc: "Xanh cả một quả đồi" },
  { name: "Người giữ rừng", icon: "nature_people", min: 23000, stage: 11, desc: "Rừng nhỏ của riêng bạn" },
  { name: "Huyền thoại", icon: "workspace_premium", min: 30000, stage: 12, desc: "Tên bạn trên bảng vàng" },
];

export function levelFor(points: number) {
  const idx = Math.max(0, LEVELS.findIndex((l, i) => points >= l.min && (i === LEVELS.length - 1 || points < LEVELS[i + 1].min)));
  const level = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const progress = next ? (points - level.min) / (next.min - level.min) : 1;
  return { level, next, progress: Math.min(1, Math.max(0, progress)), index: idx };
}

/** Roughly 1 tree "grown" per 200 points; shown as a count of trees in the customer's garden. */
export const treesFor = (points: number) => Math.floor(points / 200);

/** Friendly impact facts for a checkout: money to the farm, produce weight, servings. */
export function impactFor(lines: { quantity: number; unit: string; price_per_unit: number }[], farm: { name: string; location: string }) {
  const total = lines.reduce((s, l) => s + l.quantity * l.price_per_unit, 0);
  const toFarmer = Math.round(total * FARMER_SHARE);
  const kg = lines.filter((l) => l.unit === "kg").reduce((s, l) => s + l.quantity, 0);
  const pieces = lines.filter((l) => l.unit !== "kg").reduce((s, l) => s + l.quantity, 0);
  const servings = Math.max(2, Math.round(kg * 4 + pieces * 1.5)); // ~250 g veg per serving
  const region = farm.location.split(",").pop()?.trim() ?? farm.location;
  return { total, toFarmer, kg, pieces, servings, region, farmName: farm.name, points: pointsFor(total) };
}
