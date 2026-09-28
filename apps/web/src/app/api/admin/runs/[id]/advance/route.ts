import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { advanceRun } from "@/lib/brain";
import { pushToUsers } from "@/lib/push";
import { ORDER_STATUS_LABELS } from "@xanhtantay/types";

/** Move a run to its next stage: harvesting (4h) → loaded (6h) → delivered (16h). Customers are notified. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  const { id } = await params;
  try {
    const r = await advanceRun(id);
    await pushToUsers(r.customers, { title: "Hộp rau của bạn", body: ORDER_STATUS_LABELS[r.status as keyof typeof ORDER_STATUS_LABELS], url: "/don-hang" });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}
