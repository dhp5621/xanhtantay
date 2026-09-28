import { addressPerson } from "./commerce";

/**
 * Every notification the platform sends, worded politely and addressed the way the person is
 * addressed in the database ("bác Ba", "chị Lan").
 */
type Who = { name: string; role?: "farmer" | "customer" | null };
const to = (w: Who) => addressPerson(w.name, w.role === "farmer" ? "bác" : "bạn");

export const ANSWER_LABELS = { confirm: "Đồng ý", decline: "Không đồng ý" };

export function commandNotice(message: string) {
  return { title: "Lệnh thu hoạch mới", body: message };
}

export function orderNotice(w: Who, status: "placed" | "harvesting" | "loaded" | "delivered", farmer?: string | null) {
  const { call, pronoun } = to(w);
  const by = farmer ? addressPerson(farmer).call.replace(/^./, (c) => c.toLowerCase()) : "bác nông dân";
  const body = {
    placed: `${call} ơi, đơn của ${pronoun} đã vào sổ rồi ạ. 18h00 chốt sổ, mai rau sẽ có tại sảnh. Cảm ơn ${pronoun} đã đặt rau!`,
    harvesting: `${call} ơi, 4h00 sáng nay rau của ${pronoun} đang được ${by} thu hoạch ạ.`,
    loaded: `${call} ơi, 6h00 hộp rau của ${pronoun} đã lên xe lạnh về phố rồi ạ.`,
    delivered: `${call} ơi, rau quê đã có tại sảnh chung cư nhà ${pronoun} rồi ạ. Chúc cả nhà ngon miệng!`,
  }[status];
  return { title: "Hộp rau của bạn", body };
}

export function decisionNotice(w: Who, kind: string, approved: boolean, reason?: string | null) {
  const { call, pronoun } = to(w);
  const what = kind === "farm" ? "thông tin vườn" : kind === "produce" ? "rau củ mới đăng ký" : "rau củ đăng ký";
  return approved
    ? { title: "Đã duyệt thay đổi", body: `${call} ơi, thay đổi ${what} của ${pronoun} đã được duyệt rồi ạ. Cảm ơn ${pronoun}!` }
    : { title: "Thay đổi chưa được duyệt", body: `${call} ơi, rất tiếc thay đổi ${what} của ${pronoun} chưa được duyệt ạ.${reason ? ` Lý do: ${reason.replace(/[.!\s]+$/, "")}.` : ""} ${cap(pronoun)} cần hỗ trợ thì gọi điều phối nhé.` };
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function refundNotice(w: Who, approved: boolean, resolution: string | null, amount: number | null, reason?: string | null) {
  const { call, pronoun } = to(w);
  if (!approved) return { title: "Yêu cầu trả hàng / hoàn tiền", body: `${call} ơi, rất tiếc sau khi xác minh, yêu cầu của ${pronoun} chưa được chấp nhận ạ.${reason ? ` Lý do: ${reason.replace(/[.!\\s]+$/, "")}.` : ""} ${cap(pronoun)} cần hỗ trợ thêm xin nhắn lại cho chúng tôi nhé.` };
  const how = resolution === "replace" ? `hộp rau mới sẽ được giao bù cho ${pronoun} ở chuyến kế tiếp` : `${amount ? `${amount.toLocaleString("vi-VN")}₫` : "tiền"} sẽ được hoàn lại cho ${pronoun}`;
  return { title: "Yêu cầu trả hàng / hoàn tiền", body: `${call} ơi, chúng tôi xin lỗi vì hộp rau chưa như ý ạ. Yêu cầu của ${pronoun} đã được chấp nhận: ${how}.${reason ? ` ${reason.replace(/[.!\\s]+$/, "")}.` : ""} Cảm ơn ${pronoun} đã báo cho chúng tôi!` };
}

/** Shown after the farmer answers from the notification. */
export function answerNotice(w: Who, answer: "confirm" | "decline") {
  const { pronoun } = to(w);
  return answer === "confirm"
    ? { title: "Đã ghi nhận đồng ý", body: `Cảm ơn ${pronoun} ạ. Hẹn ${pronoun} 4h sáng, xe tải lạnh sẽ qua lấy lúc 6h.` }
    : { title: "Đã ghi nhận không đồng ý", body: `Dạ, điều phối sẽ liên hệ lại với ${pronoun} sớm ạ.` };
}
