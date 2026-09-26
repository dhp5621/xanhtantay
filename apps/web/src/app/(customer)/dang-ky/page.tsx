import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { subscriptions, farms } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function DangKyPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/dang-nhap");

  const userId = (session.user as { id: string }).id;
  const mySubs = await db
    .select({ sub: subscriptions, farm: farms })
    .from(subscriptions)
    .leftJoin(farms, eq(subscriptions.farm_id, farms.id))
    .where(eq(subscriptions.user_id, userId));

  const freqLabel = { weekly: "Mỗi tuần", monthly: "Mỗi tháng" };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--md-on-surface)", marginBottom: 4 }}>
        Gói đăng ký 🗓️
      </h1>
      <p style={{ fontSize: 14, color: "var(--md-on-surface-variant)", marginBottom: 28 }}>
        Rau củ tự động giao định kỳ, không cần đặt hàng lại
      </p>

      {mySubs.length === 0 ? (
        <div
          style={{
            background: "var(--md-surface-container)",
            borderRadius: "var(--radius-xl)",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 36, marginBottom: 12 }}>📦</p>
          <p style={{ fontWeight: 600, color: "var(--md-on-surface)", marginBottom: 8 }}>
            Chưa có gói đăng ký nào
          </p>
          <p style={{ fontSize: 13, color: "var(--md-on-surface-variant)", marginBottom: 20 }}>
            Đăng ký gói tuần/tháng từ vườn yêu thích để tiết kiệm thời gian và được ưu đãi giá tốt hơn.
          </p>
          <Link href="/farms" className="m3-filled-button" style={{ textDecoration: "none" }}>
            Chọn vườn rau
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {mySubs.map(({ sub, farm }) => (
            <div key={sub.id} className="m3-card-elevated" style={{ padding: "20px 24px" }}>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16, color: "var(--md-on-surface)", marginBottom: 4 }}>
                    {farm?.name}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="m3-chip m3-chip-primary">
                      {freqLabel[sub.frequency]}
                    </span>
                    <span className={`m3-chip ${sub.active ? "" : ""}`}
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
                  <p style={{ fontWeight: 700, color: "var(--md-primary)", fontSize: 15 }}>
                    {new Date(sub.next_delivery).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
              </div>

              {(sub.items as { product_id: string; quantity: number }[]).length > 0 && (
                <div style={{ marginTop: 12, padding: "12px", background: "var(--md-surface-container)", borderRadius: "var(--radius-md)" }}>
                  <p style={{ fontSize: 12, color: "var(--md-on-surface-variant)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>
                    Giỏ hàng định kỳ
                  </p>
                  {(sub.items as { product_id: string; quantity: number }[]).map((item, i) => (
                    <p key={i} style={{ fontSize: 13, color: "var(--md-on-surface)" }}>
                      • {item.quantity} × {item.product_id}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button className="m3-outlined-button" style={{ fontSize: 13, padding: "6px 14px" }}>
                  ✏️ Đổi món
                </button>
                {sub.active && (
                  <button className="m3-outlined-button" style={{ fontSize: 13, padding: "6px 14px", color: "var(--md-error)", borderColor: "var(--md-error)" }}>
                    Tạm dừng
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
