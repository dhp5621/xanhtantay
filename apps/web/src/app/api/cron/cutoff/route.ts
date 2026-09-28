import { NextResponse } from "next/server";
import { runCutoff } from "@/lib/brain";
import { addDays, todayVN } from "@/lib/commerce";
import { notifyCommands } from "@/lib/commands";
import { sweepStorage } from "@/lib/storage";

/** Vercel Cron, 18:00 Vietnam time (11:00 UTC) every day: close the book for tomorrow's delivery, and free unused files. */
export const maxDuration = 60;
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  const deliveryDate = addDays(todayVN(), 1);
  // Housekeeping rides along with the daily cut-off and never blocks it.
  const storage = await sweepStorage().catch(() => null);
  try {
    const result = await runCutoff(deliveryDate);
    await notifyCommands(result.run_id);
    return NextResponse.json({ ...result, storage });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi", storage }, { status: 400 });
  }
}
