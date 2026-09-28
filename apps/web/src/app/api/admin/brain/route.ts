import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { previewFor, runCutoff } from "@/lib/brain";
import { nextDeliveryDate } from "@/lib/commerce";
import { pushToUsers } from "@/lib/push";

/** GET ?date= — live preview of what the cut-off would command. */
export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  const date = new URL(req.url).searchParams.get("date") ?? nextDeliveryDate();
  return NextResponse.json(await previewFor(date));
}

/** POST { date? } — close the book now and send the harvest commands. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { date?: string };
  const date = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : nextDeliveryDate();
  try {
    const result = await runCutoff(date);
    if (result.farmers.length) await pushToUsers(result.farmers, { title: "Lệnh thu hoạch mới", body: "Có lệnh thu hoạch cho 4h sáng. Mở app để xem và xác nhận.", url: "/farmer" });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}
