export const dynamic = "force-dynamic";
import { db } from "@/db";
import { subscriptions, farms, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Khách đăng ký" };

export default async function FarmerDangKyPage() {
  const user = (await getSessionUser())!;
  const [myFarm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));
  const subs = myFarm
    ? await db.select({ sub: subscriptions, customer: { name: users.name, phone: users.phone } }).from(subscriptions)
        .leftJoin(users, eq(subscriptions.user_id, users.id)).where(eq(subscriptions.farm_id, myFarm.id))
    : [];
  const freqLabel = { weekly: "Mỗi tuần", monthly: "Mỗi tháng" };

  return (
    <div>
      <PageHeader icon="event_repeat" eyebrow={`${subs.filter((s) => s.sub.active).length} gói đang chạy`} title="Khách đăng ký" subtitle="Khách hàng nhận rau định kỳ từ vườn bạn" />

      {subs.length === 0 ? (
        <EmptyState icon="event_repeat" title="Chưa có khách đăng ký nào" description="Khi khách tạo gói tuần / tháng từ vườn bạn, họ sẽ hiện ở đây." />
      ) : (
        <div className="m3-list-group stagger">
          {subs.map(({ sub, customer }) => (
            <div key={sub.id} className="m3-list-item" style={{ cursor: "default", flexWrap: "wrap", opacity: sub.active ? 1 : 0.7 }}>
              <span className="m3-avatar">{customer?.name?.trim()?.[0]?.toUpperCase() ?? "?"}</span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <p className="title-sm text-on-surface">{customer?.name}</p>
                <p className="body-sm text-on-surface-variant">{customer?.phone ?? "—"} · {sub.items.length} món</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="m3-chip sm m3-chip-primary round"><Icon name={sub.frequency === "weekly" ? "date_range" : "calendar_month"} size={16} /> {freqLabel[sub.frequency]}</span>
                <span className={`m3-chip sm round ${sub.active ? "m3-chip-secondary" : "m3-chip-error"}`}>{sub.active ? "Đang hoạt động" : "Đã dừng"}</span>
              </div>
              <div style={{ textAlign: "right", minWidth: 110 }}>
                <p className="body-sm text-on-surface-variant">Giao tiếp theo</p>
                <p className="title-sm text-primary">{formatDate(sub.next_delivery, { day: "numeric", month: "short" })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
