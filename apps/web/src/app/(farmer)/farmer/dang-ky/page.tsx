import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { subscriptions, farms, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function FarmerDangKyPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/dang-nhap");

  const userId = (session.user as { id: string }).id;
  const [myFarm] = await db.select().from(farms).where(eq(farms.owner_id, userId));

  const subs = myFarm
    ? await db
        .select({ sub: subscriptions, customer: users })
        .from(subscriptions)
        .leftJoin(users, eq(subscriptions.user_id, users.id))
        .where(eq(subscriptions.farm_id, myFarm.id))
    : [];

  const freqLabel = { weekly: "Mỗi tuần", monthly: "Mỗi tháng" };

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--md-on-surface)", marginBottom: 4 }}>
        Khách đăng ký 🗓️
      </h1>
      <p style={{ fontSize: 14, color: "var(--md-on-surface-variant)", marginBottom: 24 }}>
        Danh sách khách hàng đăng ký định kỳ từ vườn bạn
      </p>

      {subs.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            background: "var(--md-surface-container)",
            borderRadius: "var(--radius-xl)",
          }}
        >
          <p style={{ fontSize: 36, marginBottom: 12 }}>📭</p>
          <p style={{ fontWeight: 600, color: "var(--md-on-surface)" }}>
            Chưa có khách đăng ký nào
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {subs.map(({ sub, customer }) => (
            <div key={sub.id} className="m3-card" style={{ padding: "16px 20px" }}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: "var(--md-on-surface)", marginBottom: 4 }}>
                    {customer?.name}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="m3-chip m3-chip-primary">
                      {freqLabel[sub.frequency]}
                    </span>
                    <span
                      className="m3-chip"
                      style={{
                        background: sub.active ? "var(--md-secondary-container)" : "var(--md-error-container)",
                        color: sub.active ? "var(--md-on-secondary-container)" : "var(--md-on-error-container)",
                        border: "none",
                      }}
                    >
                      {sub.active ? "Đang hoạt động" : "Đã dừng"}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 12, color: "var(--md-on-surface-variant)" }}>Giao tiếp theo</p>
                  <p style={{ fontWeight: 700, color: "var(--md-primary)", fontSize: 14 }}>
                    {new Date(sub.next_delivery).toLocaleDateString("vi-VN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
