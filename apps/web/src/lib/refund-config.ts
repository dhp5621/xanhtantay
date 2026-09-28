/** Shared by the customer form, the admin tab and the API. */
export const REFUND_REASONS: { value: string; label: string; icon: string }[] = [
  { value: "not_received", label: "Chưa nhận được hàng", icon: "inventory_2" },
  { value: "missing", label: "Thiếu hàng", icon: "scale" },
  { value: "spoiled", label: "Hàng bị hư hỏng", icon: "eco" },
  { value: "wrong", label: "Giao sai hàng", icon: "swap_horiz" },
  { value: "broken", label: "Giao hàng bị vỡ, hỏng hàng", icon: "warning" },
];
export const REFUND_METHODS: { value: string; label: string; hint: string; icon: string }[] = [
  { value: "refund", label: "Hoàn tiền", hint: "Nhận lại tiền hộp rau", icon: "payments" },
  { value: "replace", label: "Giao bù hộp khác", hint: "Nhận hộp mới ở chuyến kế tiếp", icon: "local_shipping" },
];
export const REFUND_STATUS: Record<string, { label: string; icon: string }> = {
  pending: { label: "Đang xác minh", icon: "hourglass_top" },
  approved: { label: "Đã chấp nhận", icon: "check_circle" },
  rejected: { label: "Không chấp nhận", icon: "cancel" },
};
export const REFUND_PHOTOS = 4;
export const REFUND_VIDEO_SECONDS = 60;
export const REFUND_MAX_WORDS = 200;
/** Requests are accepted this long after the box reached the lobby. */
export const REFUND_WINDOW_DAYS = 3;
/** A box that never arrived cannot be photographed: evidence is optional for that reason only. */
export const evidenceRequired = (reason: string) => reason !== "not_received";
export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export const reasonLabel = (v: string) => REFUND_REASONS.find((r) => r.value === v)?.label ?? v;
export const methodLabel = (v: string | null | undefined) => REFUND_METHODS.find((r) => r.value === v)?.label ?? "";
