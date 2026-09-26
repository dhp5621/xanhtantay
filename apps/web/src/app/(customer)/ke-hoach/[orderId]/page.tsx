export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, order_items, products, farms, meal_plans } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { MealPlanView } from "@/components/recipes/MealPlanView";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Kế hoạch ăn" };

export default async function KeHoachPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/dang-nhap?next=/ke-hoach/${orderId}&role=customer`);
  const [row] = await db.select({ o: orders, farm: { name: farms.name } }).from(orders).leftJoin(farms, eq(orders.farm_id, farms.id)).where(and(eq(orders.id, orderId), eq(orders.user_id, user.id)));
  if (!row) notFound();
  const [items, [plan]] = await Promise.all([
    db.select({ oi: order_items, p: products }).from(order_items).leftJoin(products, eq(order_items.product_id, products.id)).where(eq(order_items.order_id, orderId)),
    db.select().from(meal_plans).where(eq(meal_plans.order_id, orderId)).orderBy(desc(meal_plans.created_at)).limit(1),
  ]);
  const inventory = items.filter((i) => i.p).map((i) => ({ name: i.p!.name, qty: Number(i.oi.quantity), unit: i.p!.unit }));

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/don-hang" className="m3-btn m3-btn-text m3-btn-sm anim-in" style={{ marginLeft: -12, marginBottom: 8 }}><Icon name="arrow_back" size={18} /><span>Đơn hàng</span></Link>
      <PageHeader icon="calendar_month" eyebrow={`${row.farm?.name} · giao ${formatDate(row.o.created_at, { day: "numeric", month: "short" })}`} title="Kế hoạch ăn từ đơn này" subtitle="Rau ăn được mấy ngày và mỗi ngày nấu gì để không bỏ phí" />
      <MealPlanView orderId={orderId} delivered={row.o.status === "delivered"} inventory={inventory} initial={plan ?? null} />
    </div>
  );
}
