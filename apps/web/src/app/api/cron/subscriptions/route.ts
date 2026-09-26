import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, orders } from "@/db/schema";
import { eq, lte, and } from "drizzle-orm";

// Vercel Cron: runs daily via vercel.json cron config
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  const now = new Date();
  const dueSubs = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.active, true), lte(subscriptions.next_delivery, now)));

  const created = [];
  for (const sub of dueSubs) {
    const items = sub.items as { product_id: string; quantity: number; unit_price?: number }[];
    const total = items.reduce(
      (sum, item) => sum + (item.unit_price ?? 0) * item.quantity,
      0
    );

    const [order] = await db.insert(orders).values({
      user_id: sub.user_id,
      farm_id: sub.farm_id,
      type: "subscription",
      status: "harvesting",
      total,
      note: "Đơn tự động từ gói đăng ký",
    }).returning();

    created.push(order.id);

    // Update next delivery
    const next = new Date(sub.next_delivery);
    next.setDate(next.getDate() + (sub.frequency === "weekly" ? 7 : 30));
    await db.update(subscriptions).set({ next_delivery: next }).where(eq(subscriptions.id, sub.id));
  }

  return NextResponse.json({ created: created.length, order_ids: created });
}
