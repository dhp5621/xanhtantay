import { NextResponse } from "next/server";
import { getOrderTrace } from "@/lib/queries";
import { getSessionUser } from "@/lib/session";

/**
 * Trace lookup for one box (QR). Public: farm, harvest time, contents, journey.
 * The owner additionally gets price, payment, note, address, the care message and, on a gift order, the recipient.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trace = await getOrderTrace(id);
  if (!trace) return NextResponse.json({ error: "Không tìm thấy hộp rau với mã này" }, { status: 404 });
  const user = await getSessionUser();
  const { user_id, total, subtotal, ship_fee, note, care_message, address, group_order_id, recipient_name, recipient_phone, payment_method, payment_status, ...pub } = trace;
  if (user?.id === user_id) return NextResponse.json({ ...pub, mine: true, total, subtotal, ship_fee, note, care_message, address, group_order_id, recipient_name, recipient_phone, payment_method, payment_status });
  return NextResponse.json({ ...pub, mine: false });
}
