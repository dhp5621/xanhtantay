import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { advanceRun } from "@/lib/brain";
import { pushToUsers } from "@/lib/push";
import { orderNotice } from "@/lib/messages";

/** Move a run to its next stage: harvesting (4h) → loaded (6h) → delivered (16h). Customers are notified. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  const { id } = await params;
  try {
    const r = await advanceRun(id);
    // Each customer is addressed by name and lands on their own order when they tap.
    await Promise.all(r.orders.map((o) => pushToUsers([o.user_id], { ...orderNotice({ name: o.name, role: "customer" }, r.status as "harvesting" | "loaded" | "delivered", r.farmer), url: `/don-hang/${o.id}` })));
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}
