import { NextResponse } from "next/server";
import { minBatchBoxes, previewFor, runCutoff } from "@/lib/brain";
import { addDays, isDeliveryDay, todayVN } from "@/lib/commerce";
import { notifyCommands } from "@/lib/commands";

/**
 * Vercel Cron, 18:00 Vietnam time (11:00 UTC) every day. Only the evening before a delivery day
 * (Wednesday, Sunday) closes a book, and only when the batch reaches MIN_BATCH_BOXES: below the
 * minimum no harvest command is sent and the book stays open for the operator, who can still
 * close it by hand in /admin.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  const deliveryDate = addDays(todayVN(), 1);
  if (!isDeliveryDay(deliveryDate)) return NextResponse.json({ skipped: true, reason: "not_delivery_day", delivery_date: deliveryDate });
  try {
    const min = minBatchBoxes();
    const preview = await previewFor(deliveryDate);
    if (preview.boxes < min) return NextResponse.json({ skipped: true, reason: "below_minimum", delivery_date: deliveryDate, boxes: preview.boxes, min_batch_boxes: min });
    const result = await runCutoff(deliveryDate);
    await notifyCommands(result.run_id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}
