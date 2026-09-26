import Link from "next/link";
import { db } from "@/db";
import { group_orders, farms } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function GomDonPage() {
  const openGroups = await db
    .select({ group: group_orders, farm: farms })
    .from(group_orders)
    .leftJoin(farms, eq(group_orders.farm_id, farms.id))
    .where(eq(group_orders.status, "open"));

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--md-on-surface)", marginBottom: 4 }}>
            Gom đơn chung 👥
          </h1>
          <p style={{ fontSize: 14, color: "var(--md-on-surface-variant)" }}>
            Rủ hàng xóm cùng mua để chia ship — freeship khi nhóm đủ người
          </p>
        </div>
        <button className="m3-filled-button">
          + Tạo nhóm mới
        </button>
      </div>

      {openGroups.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--md-surface-container)",
            borderRadius: "var(--radius-xl)",
          }}
        >
          <p style={{ fontSize: 40, marginBottom: 12 }}>👥</p>
          <p style={{ fontWeight: 600, color: "var(--md-on-surface)" }}>
            Chưa có nhóm gom đơn nào
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {openGroups.map(({ group, farm }) => {
            const pct = Math.round((group.current_members / group.min_members) * 100);
            const freeship = group.current_members >= group.min_members;
            const daysLeft = Math.ceil(
              (new Date(group.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return (
              <Link key={group.id} href={`/gom-don/${group.id}`} style={{ textDecoration: "none" }}>
                <div
                  className="m3-card-elevated"
                  style={{ padding: "20px", cursor: "pointer", height: "100%" }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15, color: "var(--md-on-surface)", marginBottom: 2 }}>
                        {group.title}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--md-primary)", fontWeight: 500 }}>
                        {farm?.name}
                      </p>
                    </div>
                    {freeship && (
                      <span
                        style={{
                          background: "var(--md-primary-container)",
                          color: "var(--md-on-primary-container)",
                          borderRadius: "var(--radius-full)",
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        🚚 FREESHIP
                      </span>
                    )}
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: 12, color: "var(--md-on-surface-variant)" }}>
                        {group.current_members}/{group.min_members} người
                      </span>
                      <span style={{ fontSize: 12, color: freeship ? "var(--md-primary)" : "var(--md-on-surface-variant)", fontWeight: freeship ? 700 : 400 }}>
                        {Math.min(pct, 100)}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        background: "var(--md-surface-container-highest)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          height: "100%",
                          background: freeship ? "var(--md-primary)" : "var(--md-secondary)",
                          borderRadius: 4,
                          transition: "width .4s",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <p style={{ fontSize: 12, color: "var(--md-on-surface-variant)" }}>
                      📍 {group.shipping_address}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: daysLeft <= 1 ? "var(--md-error)" : "var(--md-on-surface-variant)",
                      }}
                    >
                      {daysLeft > 0 ? `Còn ${daysLeft} ngày` : "Hết hạn hôm nay"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
