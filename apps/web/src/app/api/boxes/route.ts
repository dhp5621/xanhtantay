import { NextResponse } from "next/server";
import { getBoxes } from "@/lib/queries";
import { nextDeliveryDate, cutoffInstant, SHIP_FEE } from "@/lib/commerce";

/** Seasonal boxes on sale, with contents, growers and the day-by-day menu. */
export async function GET() {
  const delivery_date = nextDeliveryDate();
  return NextResponse.json({ boxes: await getBoxes(), delivery_date, cutoff_at: cutoffInstant(delivery_date).toISOString(), ship_fee: SHIP_FEE });
}
