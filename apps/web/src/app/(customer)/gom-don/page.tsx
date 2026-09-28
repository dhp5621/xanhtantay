export const dynamic = "force-dynamic";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateGroupDialog } from "@/components/group/CreateGroupDialog";
import { getBoxes, getClusters, getGroups } from "@/lib/queries";
import { getSessionUser } from "@/lib/session";
import { formatYMD, nextDeliveryDate } from "@/lib/commerce";
import { formatVND } from "@/lib/format";

export const metadata = { title: "Gom đơn chung" };

export default async function GomDonPage() {
  const user = await getSessionUser();
  const [groups, boxes, clusters, [me]] = await Promise.all([
    getGroups({ onlyOpen: true }), getBoxes(), getClusters(),
    user ? db.select({ cluster_id: users.cluster_id }).from(users).where(eq(users.id, user.id)) : Promise.resolve([]),
  ]);
  const mineFirst = [...groups].sort((a, b) => Number(b.cluster_id === me?.cluster_id) - Number(a.cluster_id === me?.cluster_id));

  return (
    <div>
      <PageHeader icon="groups" eyebrow="Cùng toà nhà, cùng chuyến xe" title="Gom đơn chung" subtitle="Rủ hàng xóm cùng chung cư đặt hộp rau. Đủ nhóm là cả nhóm miễn ship."
        action={<CreateGroupDialog boxes={boxes.map((b) => ({ id: b.id, name: b.name, price: b.price, size: b.size }))} clusters={clusters} myClusterId={me?.cluster_id ?? null} earliest={nextDeliveryDate()} />} />
      {mineFirst.length === 0 ? (
        <EmptyState icon="groups" title="Chưa có nhóm nào đang mở" description="Hãy là người đầu tiên tạo nhóm cho toà nhà của bạn." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {mineFirst.map((g) => {
            const pct = Math.min(100, Math.round((g.current_members / g.min_members) * 100));
            const full = g.current_members >= g.min_members;
            const mine = g.cluster_id === me?.cluster_id;
            return (
              <Link key={g.id} href={`/gom-don/${g.id}`} className="m3-card-elevated m3-card-action" style={{ padding: 20, height: "100%", borderRadius: "var(--shape-xl)" }}>
                <div className="flex justify-between items-start gap-2 mb-4">
                  <div style={{ minWidth: 0 }}>
                    <p className="title-md text-on-surface" style={{ marginBottom: 2 }}>{g.title}</p>
                    <p className="body-sm text-primary" style={{ fontWeight: 600 }}><Icon name="apartment" size={14} /> {g.cluster.name}{mine ? " · toà của bạn" : ""}</p>
                  </div>
                  {full ? <span className="m3-chip m3-chip-primary sm round"><Icon name="local_shipping" size={16} filled /> Miễn ship</span> : <span className="m3-chip m3-chip-surface sm round">Thiếu {g.min_members - g.current_members}</span>}
                </div>
                <p className="body-sm text-on-surface-variant" style={{ marginBottom: 10 }}><Icon name="inventory_2" size={14} /> {g.box.name} · {formatVND(g.box.price)}</p>
                <div className="flex justify-between mb-1"><span className="body-sm text-on-surface-variant">{g.current_members}/{g.min_members} nhà</span><span className="body-sm tabular" style={{ color: full ? "var(--md-primary)" : "var(--md-on-surface-variant)", fontWeight: 700 }}>{pct}%</span></div>
                <div className={`m3-progress ${full ? "" : "m3-progress-wavy"}`}><div className={`m3-progress-bar ${full ? "" : "secondary"}`} style={{ width: `${pct}%` }} /></div>
                <p className="body-sm text-on-surface-variant" style={{ marginTop: 12 }}><Icon name="event" size={14} /> Giao {formatYMD(g.delivery_date)} · chốt 18h00 hôm trước</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
