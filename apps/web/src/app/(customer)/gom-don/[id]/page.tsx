export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/db";
import { group_orders, farms, group_order_members, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Icon } from "@/components/ui/Icon";
import { CopyButton } from "@/components/ui/CopyButton";
import { JoinGroupButton } from "@/components/group/JoinGroupButton";
import { getSessionUser } from "@/lib/session";
import { formatDate, daysUntil } from "@/lib/format";

export default async function GomDonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [group] = await db.select().from(group_orders).where(eq(group_orders.id, id));
  if (!group) notFound();

  const [[farm], members, user, h] = await Promise.all([
    db.select().from(farms).where(eq(farms.id, group.farm_id)),
    db.select({ member: group_order_members, user: { id: users.id, name: users.name } })
      .from(group_order_members).leftJoin(users, eq(group_order_members.user_id, users.id))
      .where(eq(group_order_members.group_order_id, group.id)),
    getSessionUser(),
    headers(),
  ]);

  const pct = Math.min(100, Math.round((group.current_members / group.min_members) * 100));
  const freeship = group.current_members >= group.min_members;
  const left = daysUntil(group.deadline);
  const joined = !!user && members.some((m) => m.member.user_id === user.id);

  // Build the invite link from the real request host instead of a hard-coded domain.
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "xanhtantay.vn";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const inviteUrl = `${proto}://${host}/gom-don/${group.id}`;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <Link href="/gom-don" className="m3-btn m3-btn-text m3-btn-sm anim-in" style={{ alignSelf: "flex-start", marginLeft: -12 }}>
        <Icon name="arrow_back" size={18} /><span>Tất cả nhóm</span>
      </Link>

      <div className="anim-in">
        <h1 className="headline-md text-on-surface" style={{ marginBottom: 4 }}>{group.title}</h1>
        <p className="body-md text-primary" style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="potted_plant" size={18} filled /> {farm?.name} · {farm?.location}
        </p>
      </div>

      {/* Status card */}
      <div className="anim-in-scale delay-1" style={{ background: freeship ? "var(--md-primary-container)" : "var(--md-surface-container)", color: freeship ? "var(--md-on-primary-container)" : "var(--md-on-surface)", borderRadius: "var(--shape-xl-inc)", padding: 28 }}>
        <div className="flex items-center gap-4 mb-5">
          <span className="m3-list-leading" style={{ width: 60, height: 60, borderRadius: "var(--shape-lg)", background: freeship ? "var(--md-primary)" : "var(--md-secondary-container)", color: freeship ? "var(--md-on-primary)" : "var(--md-on-secondary-container)" }}>
            <Icon name={freeship ? "celebration" : "group_add"} size={32} filled />
          </span>
          <div>
            <p className="title-lg">{freeship ? "Đủ điều kiện freeship!" : `Cần thêm ${group.min_members - group.current_members} người nữa`}</p>
            <p className="body-md" style={{ opacity: 0.8 }}>{group.current_members}/{group.min_members} người tham gia</p>
          </div>
        </div>
        <div className={`m3-progress thick ${freeship ? "" : "m3-progress-wavy"}`} style={{ background: "rgba(0,0,0,.08)" }}>
          <div className={`m3-progress-bar ${freeship ? "" : "secondary"}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
          <p className="body-sm" style={{ opacity: 0.85, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name="event" size={16} /> Chốt {formatDate(group.deadline, { weekday: "long", day: "numeric", month: "long" })}{left > 0 ? ` (còn ${left} ngày)` : " (hôm nay)"}
          </p>
          <p className="body-sm" style={{ opacity: 0.85, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name="location_on" size={16} /> {group.shipping_address}
          </p>
        </div>
      </div>

      {/* Invite */}
      <div className="m3-card-filled anim-in delay-2" style={{ padding: 18, borderRadius: "var(--shape-xl)" }}>
        <p className="label-md text-on-surface-variant" style={{ marginBottom: 10, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="share" size={18} /> Mời bạn bè tham gia
        </p>
        <div className="flex gap-2 flex-wrap">
          <code style={{ flex: 1, minWidth: 200, background: "var(--md-surface-container-lowest)", borderRadius: "var(--shape-md)", padding: "10px 14px", fontSize: 13, color: "var(--md-on-surface)", wordBreak: "break-all", display: "flex", alignItems: "center" }}>
            {inviteUrl}
          </code>
          <CopyButton text={inviteUrl} />
        </div>
      </div>

      {/* Members */}
      <div className="anim-in delay-3">
        <h2 className="title-lg text-on-surface" style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="group" filled /> Thành viên ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="body-md text-on-surface-variant">Chưa có ai. Hãy là người đầu tiên!</p>
        ) : (
          <div className="m3-list-group stagger">
            {members.map(({ member, user: m }) => (
              <div key={member.id} className="m3-list-item" style={{ cursor: "default" }}>
                <span className="m3-avatar sm" style={{ background: user && m?.id === user.id ? "var(--md-primary)" : undefined, color: user && m?.id === user.id ? "var(--md-on-primary)" : undefined }}>
                  {m?.name?.trim()?.[0]?.toUpperCase() ?? "?"}
                </span>
                <p className="body-md">{m?.name ?? "Thành viên ẩn danh"}{user && m?.id === user.id ? " (bạn)" : ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {group.status === "open" && left >= 0 && (
        <div className="anim-in delay-4" style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <JoinGroupButton groupId={group.id} joined={joined} />
        </div>
      )}
    </div>
  );
}
