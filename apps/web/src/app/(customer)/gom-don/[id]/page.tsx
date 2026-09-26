import { notFound } from "next/navigation";
import { db } from "@/db";
import { group_orders, farms, group_order_members, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function GomDonDetailPage({ params }: { params: { id: string } }) {
  const [group] = await db.select().from(group_orders).where(eq(group_orders.id, params.id));
  if (!group) notFound();

  const [farm] = await db.select().from(farms).where(eq(farms.id, group.farm_id));
  const members = await db
    .select({ member: group_order_members, user: users })
    .from(group_order_members)
    .leftJoin(users, eq(group_order_members.user_id, users.id))
    .where(eq(group_order_members.group_order_id, group.id));

  const pct = Math.round((group.current_members / group.min_members) * 100);
  const freeship = group.current_members >= group.min_members;
  const daysLeft = Math.ceil(
    (new Date(group.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const inviteUrl = `${process.env.NEXTAUTH_URL ?? "https://xanhtantay.vn"}/gom-don/${group.id}`;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--md-on-surface)", marginBottom: 4 }}>
          {group.title}
        </h1>
        <p style={{ fontSize: 14, color: "var(--md-primary)", fontWeight: 500 }}>
          {farm?.name} • {farm?.location}
        </p>
      </div>

      {/* Status card */}
      <div
        style={{
          background: freeship ? "var(--md-primary-container)" : "var(--md-surface-container)",
          borderRadius: "var(--radius-xl)",
          padding: "24px",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span style={{ fontSize: 28 }}>{freeship ? "🎉" : "👥"}</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, color: freeship ? "var(--md-on-primary-container)" : "var(--md-on-surface)" }}>
              {freeship ? "Đủ điều kiện FREESHIP!" : `Cần thêm ${group.min_members - group.current_members} người nữa`}
            </p>
            <p style={{ fontSize: 13, color: freeship ? "var(--md-on-primary-container)" : "var(--md-on-surface-variant)" }}>
              {group.current_members}/{group.min_members} người tham gia
            </p>
          </div>
        </div>

        <div
          style={{
            height: 10,
            background: "rgba(0,0,0,.1)",
            borderRadius: 5,
            overflow: "hidden",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: `${Math.min(pct, 100)}%`,
              height: "100%",
              background: freeship ? "var(--md-primary)" : "var(--md-secondary)",
              borderRadius: 5,
              transition: "width .5s",
            }}
          />
        </div>
        <p style={{ fontSize: 12, color: freeship ? "var(--md-on-primary-container)" : "var(--md-on-surface-variant)" }}>
          📅 Hạn chốt đơn:{" "}
          {new Date(group.deadline).toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          {daysLeft > 0 ? ` (còn ${daysLeft} ngày)` : " (hôm nay)"}
        </p>
      </div>

      {/* Invite link */}
      <div
        style={{
          background: "var(--md-surface-container)",
          borderRadius: "var(--radius-lg)",
          padding: "16px",
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--md-on-surface-variant)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>
          Mời bạn bè tham gia
        </p>
        <div className="flex gap-2">
          <code
            style={{
              flex: 1,
              background: "var(--md-surface-container-highest)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              fontSize: 13,
              color: "var(--md-on-surface)",
              fontFamily: "monospace",
              wordBreak: "break-all",
            }}
          >
            {inviteUrl}
          </code>
          <button className="m3-tonal-button" style={{ padding: "8px 16px", fontSize: 13, whiteSpace: "nowrap" }}>
            Sao chép
          </button>
        </div>
      </div>

      {/* Members */}
      {members.length > 0 && (
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--md-on-surface)", marginBottom: 12 }}>
            Thành viên ({members.length})
          </h2>
          <div className="flex flex-col gap-2">
            {members.map(({ member, user }) => (
              <div
                key={member.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: "var(--md-surface-container-low)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "var(--md-primary-container)",
                    color: "var(--md-on-primary-container)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {user?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--md-on-surface)" }}>
                  {user?.name ?? "Thành viên ẩn danh"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Join button */}
      {group.status === "open" && (
        <button className="m3-filled-button" style={{ alignSelf: "center", padding: "12px 32px", fontSize: 15 }}>
          Tham gia nhóm này
        </button>
      )}
    </div>
  );
}
