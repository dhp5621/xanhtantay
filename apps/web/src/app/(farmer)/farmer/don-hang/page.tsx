export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders, farms, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ORDER_STATUS_LABELS } from "@xanhtantay/types";

export default async function FarmerDonHangPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/dang-nhap");

  const userId = (session.user as { id: string }).id;
  const [myFarm] = await db.select().from(farms).where(eq(farms.owner_id, userId));

  const farmOrders = myFarm
    ? await db
        .select({ order: orders, customer: users })
        .from(orders)
        .leftJoin(users, eq(orders.user_id, users.id))
        .where(eq(orders.farm_id, myFarm.id))
    : [];

  const nextStatus: Record<string, string> = {
    harvesting: "loaded",
    loaded: "delivered",
  };
  const nextStatusLabel: Record<string, string> = {
    harvesting: "Đã lên xe 🚚",
    loaded: "Đã giao 🏡",
  };

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--md-on-surface)", marginBottom: 4 }}>
        Đơn hàng 📦
      </h1>
      <p style={{ fontSize: 14, color: "var(--md-on-surface-variant)", marginBottom: 24 }}>
        Cập nhật trạng thái đơn để khách hàng theo dõi
      </p>

      {farmOrders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--md-surface-container)",
            borderRadius: "var(--radius-xl)",
          }}
        >
          <p style={{ fontSize: 36, marginBottom: 12 }}>📭</p>
          <p style={{ fontWeight: 600, color: "var(--md-on-surface)" }}>Chưa có đơn hàng nào</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {farmOrders.map(({ order, customer }) => (
            <div key={order.id} className="m3-card-elevated" style={{ padding: "18px 22px" }}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: "var(--md-on-surface)", marginBottom: 4 }}>
                    {customer?.name ?? "Khách hàng"}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      padding: "3px 10px",
                      borderRadius: "var(--radius-full)",
                      display: "inline-block",
                    }}
                    className={`status-${order.status}`}
                  >
                    {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 17, fontWeight: 800, color: "var(--md-primary)" }}>
                    {order.total.toLocaleString("vi-VN")}₫
                  </p>
                  <p style={{ fontSize: 11, color: "var(--md-on-surface-variant)" }}>
                    {new Date(order.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
              {order.status !== "delivered" && (
                <form action={`/api/orders/${order.id}/status`} method="POST" style={{ marginTop: 12 }}>
                  <input type="hidden" name="status" value={nextStatus[order.status]} />
                  <button type="submit" className="m3-tonal-button" style={{ fontSize: 13, padding: "6px 16px" }}>
                    {nextStatusLabel[order.status]}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
