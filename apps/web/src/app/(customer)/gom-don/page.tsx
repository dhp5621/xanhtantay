export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/db";
import { group_orders, farms } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateGroupDialog } from "@/components/group/CreateGroupDialog";
import { daysUntil } from "@/lib/format";

export const metadata = { title: "Gom đơn chung" };

export default async function GomDonPage() {
  const [openGroups, farmOpts] = await Promise.all([
    db.select({ group: group_orders, farm: farms }).from(group_orders)
      .leftJoin(farms, eq(group_orders.farm_id, farms.id))
      .where(eq(group_orders.status, "open")).orderBy(desc(group_orders.created_at)),
    db.select({ id: farms.id, name: farms.name }).from(farms),
  ]);

  return (
    <div>
      <PageHeader icon="groups" eyebrow="Mua chung, chia ship" title="Gom đơn chung" subtitle="Rủ hàng xóm cùng mua để chia ship. Freeship khi nhóm đủ người." action={<CreateGroupDialog farms={farmOpts} />} />

      {openGroups.length === 0 ? (
        <EmptyState icon="groups" title="Chưa có nhóm gom đơn nào" description="Hãy là người đầu tiên tạo nhóm cho khu của bạn." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {openGroups.map(({ group, farm }) => {
            const pct = Math.min(100, Math.round((group.current_members / group.min_members) * 100));
            const freeship = group.current_members >= group.min_members;
            const left = daysUntil(group.deadline);
            return (
              <Link key={group.id} href={`/gom-don/${group.id}`} className="m3-card-elevated m3-card-action" style={{ padding: 20, height: "100%", borderRadius: "var(--shape-xl)" }}>
                <div className="flex justify-between items-start gap-2 mb-4">
                  <div style={{ minWidth: 0 }}>
                    <p className="title-md text-on-surface" style={{ marginBottom: 2 }}>{group.title}</p>
                    <p className="body-sm text-primary" style={{ fontWeight: 600 }}>{farm?.name}</p>
                  </div>
                  {freeship ? (
                    <span className="m3-chip m3-chip-primary sm round"><Icon name="local_shipping" size={16} filled /> Freeship</span>
                  ) : (
                    <span className="m3-chip m3-chip-surface sm round">Thiếu {group.min_members - group.current_members}</span>
                  )}
                </div>

                <div className="flex justify-between mb-1">
                  <span className="body-sm text-on-surface-variant">{group.current_members}/{group.min_members} người</span>
                  <span className="body-sm tabular" style={{ color: freeship ? "var(--md-primary)" : "var(--md-on-surface-variant)", fontWeight: 700 }}>{pct}%</span>
                </div>
                <div className={`m3-progress ${freeship ? "" : "m3-progress-wavy"}`}>
                  <div className={`m3-progress-bar ${freeship ? "" : "secondary"}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="flex justify-between items-center gap-2 mt-4">
                  <p className="body-sm text-on-surface-variant" style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                    <Icon name="location_on" size={16} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.shipping_address}</span>
                  </p>
                  <p className="body-sm" style={{ fontWeight: 600, whiteSpace: "nowrap", color: left <= 1 ? "var(--md-error)" : "var(--md-on-surface-variant)" }}>
                    {left > 0 ? `Còn ${left} ngày` : "Chốt hôm nay"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
