/** Mirrors apps/web/src/lib/commerce.ts — display-only constants (the server enforces the real rules). */

export const MIN_DIRECT_ORDER = 100_000;
export const FARMER_SHARE = 0.925;
export const POINTS_PER_1000 = 1;

export const pointsFor = (totalVnd: number) => Math.floor(totalVnd / 1000) * POINTS_PER_1000;

export interface Level { name: string; icon: string; min: number; stage: number; desc: string }
export const LEVELS: Level[] = [
  { name: "Hạt mầm", icon: "🌱", min: 0, stage: 0, desc: "Bắt đầu gieo" },
  { name: "Mầm non", icon: "🌿", min: 100, stage: 1, desc: "Đã nhú lá đầu" },
  { name: "Cây non", icon: "🪴", min: 300, stage: 2, desc: "Vươn cao mỗi tuần" },
  { name: "Cây xanh", icon: "🌳", min: 700, stage: 3, desc: "Đã cho bóng mát" },
  { name: "Cây ra hoa", icon: "🌸", min: 1100, stage: 4, desc: "Ong bướm ghé thăm" },
  { name: "Cây trĩu quả", icon: "🍎", min: 1500, stage: 5, desc: "Mùa nào cũng có quả" },
  { name: "Cổ thụ", icon: "🌲", min: 3000, stage: 6, desc: "Chim về làm tổ" },
  { name: "Vườn nhỏ", icon: "🏡", min: 5000, stage: 7, desc: "Thêm cây bên cạnh" },
  { name: "Trang trại", icon: "🚜", min: 9000, stage: 8, desc: "Nuôi cả xóm" },
  { name: "Đồi rau", icon: "⛰️", min: 14000, stage: 9, desc: "Xanh cả một quả đồi" },
  { name: "Người giữ rừng", icon: "🌍", min: 20000, stage: 10, desc: "Rừng nhỏ của riêng bạn" },
  { name: "Huyền thoại", icon: "🏆", min: 28000, stage: 11, desc: "Tên bạn trên bảng vàng" },
];

export function levelFor(points: number) {
  const idx = Math.max(0, LEVELS.findIndex((l, i) => points >= l.min && (i === LEVELS.length - 1 || points < LEVELS[i + 1].min)));
  const level = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const progress = next ? (points - level.min) / (next.min - level.min) : 1;
  return { level, next, progress: Math.min(1, Math.max(0, progress)), index: idx };
}

export const treesFor = (points: number) => Math.floor(points / 200);

export function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

export const ORDER_TYPE_LABELS: Record<string, string> = {
  single: "Đơn lẻ",
  subscription: "Định kỳ",
  group: "Gom đơn",
};
