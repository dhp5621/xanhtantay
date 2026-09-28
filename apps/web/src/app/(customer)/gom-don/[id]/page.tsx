export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { CopyButton } from "@/components/ui/CopyButton";
import { CutoffBanner } from "@/components/ui/CutoffBanner";
import { JoinGroupButton } from "@/components/group/JoinGroupButton";
import { getGroups, getGroupMembers } from "@/lib/queries";
import { getSessionUser } from "@/lib/session";
import { cutoffInstant, formatYMD, isPastCutoff, SHIP_FEE } from "@/lib/commerce";
import { formatVND } from "@/lib/format";

export const metadata = { title: "Nhóm gom đơn" };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [group] = await getGroups({ id });
  if (!group) notFound();
  const [members, user, h] = await Promise.all([getGroupMembers(id), getSessionUser(), headers()]);
  const pct = Math.min(100, Math.round((group.current_members / group.min_members) * 100));
  const full = group.current_members >= group.min_members;
  const closed = group.status !== "open" || isPastCutoff(group.delivery_date);
  const joined = !!user && members.some((m) => m.user_id === user.id);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "xanhtantay.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const inviteUrl = `${proto}://${host}/gom-don/${group.id}`;
  const boxes = members.reduce((s, m) => s + m.quantity, 0);

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <Link href="/gom-don" className="m3-btn m3-btn-text m3-btn-sm anim-in" style={{ alignSelf: "flex-start", marginLeft: -12 }}><Icon name="arrow_back" size={18} /><span>Tất cả nhóm</span></Link>
      <div className="anim-in">
        <h1 className="headline-md text-on-surface" style={{ marginBottom: 4 }}>{group.title}</h1>
        <p className="body-md text-primary" style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="apartment" size={18} filled /> {group.cluster.name} · {group.cluster.address}, {group.cluster.district}</p>
      </div>

      <div className="anim-in-scale delay-1" style={{ background: full ? "var(--md-primary-container)" : "var(--md-surface-container)", color: full ? "var(--md-on-primary-container)" : "var(--md-on-surface)", borderRadius: "var(--shape-xl-inc)", padding: 28 }}>
        <div className="flex items-center gap-4 mb-5">
          <span className="m3-list-leading" style={{ width: 60, height: 60, borderRadius: "var(--shape-lg)", background: full ? "var(--md-primary)" : "var(--md-secondary-container)", color: full ? "var(--md-on-primary)" : "var(--md-on-secondary-container)" }}><Icon name={full ? "celebration" : "group_add"} size={32} filled /></span>
          <div>
            <p className="title-lg">{full ? "Đủ nhóm, cả nhóm miễn ship!" : `Cần thêm ${group.min_members - group.current_members} nhà nữa`}</p>
            <p className="body-md" style={{ opacity: 0.8 }}>{group.current_members}/{group.min_members} nhà · {boxes} hộp{full ? "" : ` · chưa đủ thì phí giao ${formatVND(SHIP_FEE)}/nhà`}</p>
          </div>
        </div>
        <div className={`m3-progress thick ${full ? "" : "m3-progress-wavy"}`} style={{ background: "rgba(0,0,0,.08)" }}><div className={`m3-progress-bar ${full ? "" : "secondary"}`} style={{ width: `${pct}%` }} /></div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
          <p className="body-sm" style={{ opacity: 0.85 }}><Icon name="inventory_2" size={16} /> <Link href={`/hop-rau/${group.box.slug}`} style={{ color: "inherit", fontWeight: 600 }}>{group.box.name}</Link> · {formatVND(group.box.price)}</p>
          <p className="body-sm" style={{ opacity: 0.85 }}><Icon name="event" size={16} /> Giao {formatYMD(group.delivery_date)}, 16h00 tại sảnh</p>
        </div>
      </div>

      {!closed && <div className="anim-in delay-2"><CutoffBanner cutoffAt={cutoffInstant(group.delivery_date).toISOString()} deliveryLabel={formatYMD(group.delivery_date)} compact /></div>}

      <div className="m3-card-filled anim-in delay-2" style={{ padding: 18, borderRadius: "var(--shape-xl)" }}>
        <p className="label-md text-on-surface-variant" style={{ marginBottom: 10, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="share" size={18} /> Gửi vào nhóm cư dân</p>
        <div className="flex gap-2 flex-wrap">
          <code style={{ flex: 1, minWidth: 200, background: "var(--md-surface-container-lowest)", borderRadius: "var(--shape-md)", padding: "10px 14px", fontSize: 13, color: "var(--md-on-surface)", wordBreak: "break-all", display: "flex", alignItems: "center" }}>{inviteUrl}</code>
          <CopyButton text={inviteUrl} />
        </div>
      </div>

      <div className="anim-in delay-3">
        <h2 className="title-lg text-on-surface" style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="group" filled /> Các nhà trong nhóm ({members.length})</h2>
        {members.length === 0 ? <p className="body-md text-on-surface-variant">Chưa có ai. Hãy là nhà đầu tiên!</p> : (
          <div className="m3-list-group stagger">
            {members.map((m) => (
              <div key={m.id} className="m3-list-item" style={{ cursor: "default" }}>
                <Avatar name={m.name} src={m.avatar_url} size="sm" />
                <p className="body-md" style={{ flex: 1 }}>{m.name}{user && m.user_id === user.id ? " (bạn)" : ""}</p>
                <span className="m3-chip sm round m3-chip-surface tabular">{m.quantity} hộp</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="anim-in delay-4" style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}><JoinGroupButton groupId={group.id} joined={joined} closed={closed} /></div>
    </div>
  );
}
