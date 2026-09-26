export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, farms } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getLoyalty } from "@/lib/loyalty";
import { LEVELS, pointsFor, FARMER_SHARE } from "@/lib/commerce";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { GrowingTree } from "@/components/loyalty/GrowingTree";
import { LevelPager } from "@/components/loyalty/LevelPager";
import { formatVND, formatDate } from "@/lib/format";

export const metadata = { title: "Vườn của tôi" };

export default async function VuonCuaToiPage() {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?next=/vuon-cua-toi&role=customer");
  const [l, recent] = await Promise.all([
    getLoyalty(user.id),
    db.select({ o: orders, farm: { name: farms.name, location: farms.location } }).from(orders).leftJoin(farms, eq(orders.farm_id, farms.id))
      .where(and(eq(orders.user_id, user.id), eq(orders.status, "delivered"))).orderBy(desc(orders.created_at)).limit(8),
  ]);
  const toFarmers = Math.round(l.deliveredTotal * FARMER_SHARE);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader icon="park" eyebrow="Tích điểm · Trồng cây" title="Vườn của tôi" subtitle="Mỗi đơn giao xong là thêm điểm, cây lớn thêm một chút" />

      <section className="m3-hero anim-in-scale" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center" }}>
        <span className="m3-hero-blob" style={{ width: 260, height: 260, right: -80, top: -100 }} />
        <div style={{ position: "relative" }}><GrowingTree stage={l.level.stage} /></div>
        <div style={{ position: "relative" }}>
          <p className="m3-eyebrow">Hạng hiện tại</p>
          <h2 className="display-sm" style={{ color: "var(--md-on-primary-container)", display: "inline-flex", alignItems: "center", gap: 10 }}><Icon name={l.level.icon} size={36} filled /> {l.level.name}</h2>
          <p className="body-md" style={{ color: "var(--md-on-secondary-container)", marginTop: 4 }}>{l.level.desc}</p>
          <p className="headline-md tabular" style={{ color: "var(--md-on-primary-container)", marginTop: 14 }}>{l.points} điểm</p>
          {l.next ? (
            <>
              <div className="m3-progress" style={{ marginTop: 8, background: "rgba(0,0,0,.1)" }}><div className="m3-progress-bar" style={{ width: `${l.progress * 100}%` }} /></div>
              <p className="body-sm" style={{ color: "var(--md-on-secondary-container)", marginTop: 6 }}>Còn {l.next.min - l.points} điểm nữa lên <strong>{l.next.name}</strong>{l.pendingPoints > 0 ? ` · ${l.pendingPoints} điểm đang chờ đơn giao xong` : ""}</p>
            </>
          ) : <p className="body-sm" style={{ color: "var(--md-on-secondary-container)", marginTop: 6 }}>Bạn đã ở hạng cao nhất. Cảm ơn vì đã nuôi cả khu vườn!</p>}
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
        {[
          { icon: "forest", v: l.trees, label: "cây đã trồng", desc: "1 cây / 200 điểm" },
          { icon: "package_2", v: l.deliveredOrders, label: "đơn đã nhận", desc: "rau về tận cửa" },
          { icon: "payments", v: formatVND(toFarmers), label: "đến tay nhà vườn", desc: "không qua trung gian" },
          { icon: "stars", v: `${l.pendingPoints}`, label: "điểm đang chờ", desc: "đơn đang thu hoạch / giao" },
        ].map((t) => (
          <div key={t.label} className="m3-card-filled lift" style={{ padding: "18px 18px 16px", borderRadius: "var(--shape-xl)" }}>
            <Icon name={t.icon} className="text-primary" filled />
            <p className="headline-sm text-on-surface tabular" style={{ marginTop: 4 }}>{t.v}</p>
            <p className="title-sm text-on-surface">{t.label}</p>
            <p className="body-sm text-on-surface-variant">{t.desc}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="trending_up" filled /> Các hạng</h2></div>
        <LevelPager levels={LEVELS} points={l.points} currentIndex={l.index} />
      </section>

      <section>
        <div className="m3-section-head">
          <h2 className="title-lg text-on-surface"><Icon name="history" filled /> Điểm đã nhận</h2>
          <Link href="/don-hang" className="m3-btn m3-btn-text m3-btn-sm"><span>Đơn hàng</span><Icon name="arrow_forward" size={18} /></Link>
        </div>
        {recent.length === 0 ? (
          <p className="body-md text-on-surface-variant">Chưa có đơn nào giao xong. Điểm chỉ được cộng khi rau đã về tới cửa.</p>
        ) : (
          <div className="m3-list-group stagger">
            {recent.map(({ o, farm }) => (
              <div key={o.id} className="m3-list-item" style={{ cursor: "default" }}>
                <span className="m3-list-leading"><Icon name="eco" /></span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block" }}>{farm?.name}</span>
                  <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{formatDate(o.created_at, { day: "numeric", month: "short" })} · {formatVND(o.total)} · góp {formatVND(Math.round(o.total * FARMER_SHARE))} cho vườn ở {farm?.location.split(",").pop()?.trim()}</span>
                </span>
                <span className="m3-chip sm round m3-chip-primary tabular">+{pointsFor(o.total)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
