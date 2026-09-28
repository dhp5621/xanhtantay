import { NextResponse } from "next/server";
import { runCutoff } from "@/lib/brain";
import { addDays, todayVN } from "@/lib/commerce";
import { pushToUsers } from "@/lib/push";

/** Vercel Cron, 18:00 Vietnam time (11:00 UTC) every day: close the book for tomorrow's delivery. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  const deliveryDate = addDays(todayVN(), 1);
  try {
    const result = await runCutoff(deliveryDate);
    if (result.farmers.length) await pushToUsers(result.farmers, { title: "Lệnh thu hoạch mới", body: "Có lệnh thu hoạch cho 4h sáng mai. Mở app để xem và xác nhận.", url: "/farmer" });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}
