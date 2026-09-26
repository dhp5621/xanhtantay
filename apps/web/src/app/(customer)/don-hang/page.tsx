export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders, farms, order_items, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ORDER_STATUS_LABELS } from "@xanhtantay/types";

export default async function DonHangPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/dang-nhap");

  const userId = (session.user as { id: string }).id;
  const myOrders = await db
    .select({ order: orders, farm: farms })
    .from(orders)
    .leftJoin(farms, eq(orders.farm_id, farms.id))
    .where(eq(orders.user_id, userId))
    .orderBy(orders.created_at);

  const statusColors: Record<string, string> = {
    harvesting: "status-harvesting",
    loaded: "status-loaded",
    delivered: "status-delivered",
  };

  const typeLabels: Record<string, string> = {
    single: "Đơn lẻ",
    subscription: "Đăng ký",
    group: "Gom đơn",
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--md-on-surface)", marginBottom: 4 }}>
        Đơn hàng của tôi 📦
      </h1>
      <p style={{ fontSize: 14, color: "var(--md-on-surface-variant)", marginBottom: 28 }}>
        Theo dõi hành trình rau củ từ vườn đến nhà bạn
      </p>

      {myOrders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--md-surface-container)",
            borderRadius: "var(--radius-xl)",
          }}
        >
          <p style={{ fontSize: 40, marginBottom: 12 }}>🌱</p>
          <p style={{ fontWeight: 600, color: "var(--md-on-surface)", marginBottom: 8 }}>
            Chưa có đơn hàng nào
          </p>
          <p style={{ fontSize: 13, color: "var(--md-on-surface-variant)" }}>
            Khám phá các vườn rau và đặt đơn đầu tiên nhé!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {myOrders.map(({ order, farm }) => (
            <div
              key={order.id}
              className="m3-card-elevated"
              style={{ padding: "20px 24px" }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16, color: "var(--md-on-surface)", marginBottom: 4 }}>
                    {farm?.name ?? "Vườn rau"}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="m3-chip">{typeLabels[order.type] ?? order.type}</span>
                    <span
                      className={`m3-chip ${statusColors[order.status]}`}
                      style={{ border: "none", borderRadius: "var(--radius-full)", padding: "3px 10px" }}
                    >
                      {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "var(--md-primary)" }}>
                    {order.total.toLocaleString("vi-VN")}₫
                  </p>
                  <p style={{ fontSize: 12, color: "var(--md-on-surface-variant)", marginTop: 2 }}>
                    {new Date(order.created_at).toLocaleDateString("vi-VN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: 16 }}>
                <div className="flex justify-between mb-2">
                  {["harvesting", "loaded", "delivered"].map((step, i) => {
                    const steps = ["harvesting", "loaded", "delivered"];
                    const currentIdx = steps.indexOf(order.status);
                    const done = i <= currentIdx;
                    const labels = ["Thu hoạch", "Lên xe", "Đã giao"];
                    return (
                      <div key={step} style={{ textAlign: "center", flex: 1 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: done ? "var(--md-primary)" : "var(--md-surface-container-highest)",
                            color: done ? "var(--md-on-primary)" : "var(--md-on-surface-variant)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 4px",
                            fontSize: 13,
                            fontWeight: 700,
                            transition: "background .3s",
                          }}
                        >
                          {done ? "✓" : i + 1}
                        </div>
                        <p style={{ fontSize: 11, color: done ? "var(--md-primary)" : "var(--md-on-surface-variant)", fontWeight: done ? 600 : 400 }}>
                          {labels[i]}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
