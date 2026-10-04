export const dynamic = "force-dynamic";
import Link from "next/link";
import { count, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { clusters, farms, orders, users, callName } from "@/db/schema";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { getSessionUser } from "@/lib/session";
import { Landing } from "@/components/landing/Landing";
import { MixCard } from "@/components/box/MixCard";
import { CutoffBanner } from "@/components/ui/CutoffBanner";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { getBoxes, getFarms, getGroups, getOrdersForUser, groupMixes } from "@/lib/queries";
import { cutoffInstant, formatYMD, nextDeliveryDate, addressFarmer, addressPerson } from "@/lib/commerce";

export default async function HomePage() {
  const user = await getSessionUser();
  const deliveryDate = nextDeliveryDate();
  const cutoffAt = cutoffInstant(deliveryDate).toISOString();
  const [boxList, farmList] = await Promise.all([getBoxes(), getFarms()]);

  if (!user) {
    const [[f], [c], [d]] = await Promise.all([
      db.select({ c: count() }).from(farms),
      db.select({ c: count() }).from(clusters),
      db.select({ s: sum(orders.quantity) }).from(orders).where(eq(orders.status, "delivered")),
    ]);
    return <Landing boxes={boxList} farms={farmList} stats={{ farms: f.c, clusters: c.c, boxes_delivered: Number(d.s ?? 0) }} deliveryDate={deliveryDate} cutoffAt={cutoffAt} />;
  }

  const [[me], groups, mine] = await Promise.all([
    db.select({ cluster_id: users.cluster_id, cluster: clusters.name, call: callName }).from(users).leftJoin(clusters, eq(users.cluster_id, clusters.id)).where(eq(users.id, user.id)),
    getGroups({ onlyOpen: true }),
    getOrdersForUser(user.id),
  ]);
  const live = mine.find((o) => o.status !== "delivered" && o.status !== "cancelled");
  const near = me?.cluster_id ? groups.filter((g) => g.cluster_id === me.cluster_id) : [];
  const shown = [...near, ...groups.filter((g) => !near.includes(g))].slice(0, 3);

  return (
    <div className="flex flex-col gap-12">
      <section className="m3-hero anim-in-scale">
        <span className="m3-hero-blob" style={{ width: 320, height: 320, right: -80, top: -120 }} />
        <div style={{ position: "relative", maxWidth: 620 }}>
          <p className="m3-eyebrow anim-in" style={{ marginBottom: 12 }}>Chào {addressPerson(me?.call ?? user.name ?? "bạn").call.replace(/^./, (c) => c.toLowerCase())}{me?.cluster ? ` · ${me.cluster}` : ""}</p>
          <h1 className="display-md anim-in delay-1" style={{ color: "var(--md-on-primary-container)", marginBottom: 14 }}>Thùng rau mẹ gửi</h1>
          <p className="body-lg anim-in delay-2" style={{ color: "var(--md-on-secondary-container)", maxWidth: 480, marginBottom: 20 }}>Hộp rau theo mùa từ nương đồi Bắc Kạn, Tuyên Quang. Giao thứ Tư và Chủ nhật tới ký túc xá, khu trọ của bạn.</p>
          <div className="anim-in delay-3" style={{ marginBottom: 18 }}><CutoffBanner cutoffAt={cutoffAt} deliveryLabel={formatYMD(deliveryDate)} /></div>
          <div className="flex flex-wrap gap-3 anim-in delay-3">
            <Link href="/hop-rau" className="m3-btn m3-btn-filled m3-btn-lg"><Icon name="inventory_2" filled /><span>Chọn hộp rau</span></Link>
            <Link href="/gom-don" className="m3-btn m3-btn-elevated m3-btn-lg"><Icon name="groups" /><span>Gom đơn cùng khu</span></Link>
          </div>
        </div>
      </section>

      {live && (
        <section className="anim-in">
          <div className="m3-section-head"><h2 className="headline-sm text-on-surface"><Icon name="local_shipping" filled /> Hộp rau của bạn</h2><Link href={`/don-hang/${live.id}`} className="m3-btn m3-btn-text m3-btn-sm"><span>Chi tiết</span><Icon name="arrow_forward" size={18} /></Link></div>
          <Link href={`/don-hang/${live.id}`} className="m3-card-elevated m3-card-action" style={{ padding: "20px 22px", borderRadius: "var(--shape-xl)" }}>
            <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 14 }}>
              <p className="title-md text-on-surface">{live.quantity} × {live.box.name}</p>
              <span className="body-sm text-on-surface-variant">Giao {formatYMD(live.delivery_date)}</span>
            </div>
            <OrderTimeline status={live.status} compact farmer={live.farmers[0] ? addressFarmer(live.farmers[0].farmer).call.replace(/^./, (c) => c.toLowerCase()) : null} />
          </Link>
        </section>
      )}

      <section>
        <div className="m3-section-head"><h2 className="headline-sm text-on-surface"><Icon name="inventory_2" filled /> Hộp mùa này</h2><Link href="/hop-rau" className="m3-btn m3-btn-text m3-btn-sm"><span>Xem tất cả</span><Icon name="arrow_forward" size={18} /></Link></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">{groupMixes(boxList).map((m) => <MixCard key={m.mix} mix={m} />)}</div>
      </section>

      {shown.length > 0 && (
        <section>
          <div className="m3-section-head"><h2 className="headline-sm text-on-surface"><Icon name="groups" filled /> Gom đơn {near.length ? `ở ${me?.cluster}` : "đang mở"}</h2><Link href="/gom-don" className="m3-btn m3-btn-text m3-btn-sm"><span>Xem tất cả</span><Icon name="arrow_forward" size={18} /></Link></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {shown.map((g) => {
              const pct = Math.min(100, Math.round((g.current_members / g.min_members) * 100));
              const full = g.current_members >= g.min_members;
              return (
                <Link key={g.id} href={`/gom-don/${g.id}`} className="m3-card-elevated m3-card-action" style={{ padding: 20, borderRadius: "var(--shape-xl)" }}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div style={{ minWidth: 0 }}><p className="title-md text-on-surface" style={{ marginBottom: 2 }}>{g.title}</p><p className="body-sm text-on-surface-variant">{g.cluster.name} · {g.box.name}</p></div>
                    {full && <span className="m3-chip m3-chip-primary sm round"><Icon name="local_shipping" size={16} filled /> Miễn ship</span>}
                  </div>
                  <div className={`m3-progress ${full ? "" : "m3-progress-wavy"}`}><div className={`m3-progress-bar ${full ? "" : "secondary"}`} style={{ width: `${pct}%` }} /></div>
                  <div className="flex justify-between mt-2"><span className="body-sm text-on-surface-variant">{g.current_members}/{g.min_members} người</span><span className="body-sm text-on-surface-variant" style={{ fontWeight: 600 }}>Giao {formatYMD(g.delivery_date, { weekday: "short", day: "numeric", month: "numeric" })}</span></div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="m3-section-head"><h2 className="headline-sm text-on-surface"><Icon name="potted_plant" filled /> Rau từ những vườn này</h2><Link href="/farms" className="m3-btn m3-btn-text m3-btn-sm"><span>Xem tất cả</span><Icon name="arrow_forward" size={18} /></Link></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          {farmList.map((farm) => (
            <Link key={farm.id} href={`/farms/${farm.slug}`} className="m3-card-elevated m3-card-action" style={{ borderRadius: "var(--shape-xl)" }}>
              <div className="m3-media-wrap" style={{ height: 130, position: "relative" }}>
                {farm.cover_url ? <SmartImage src={farm.cover_url} alt={farm.name} className="m3-card-media" style={{ position: "absolute", inset: 0 }} /> : <div style={{ position: "absolute", inset: 0, background: "var(--md-primary-container)" }} />}
              </div>
              <div style={{ padding: "14px 18px 16px" }}>
                <p className="title-md text-on-surface">{farm.name}</p>
                <p className="body-sm text-on-surface-variant" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="location_on" size={14} filled /> {farm.location}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
