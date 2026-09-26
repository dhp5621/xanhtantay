export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/db";
import { farms, farm_diary, group_orders, products } from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { formatDate, daysUntil, formatDateTime, timeAgo } from "@/lib/format";
import { getSessionUser } from "@/lib/session";
import { Landing } from "@/components/landing/Landing";
import { MediaGallery } from "@/components/ui/MediaGallery";

export default async function HomePage() {
  const user = await getSessionUser();

  // Visitors get the marketing landing page; signed-in users get their feed.
  if (!user) {
    const [teaser, [f], [p], [g]] = await Promise.all([
      db.select({ id: farms.id, name: farms.name, slug: farms.slug, location: farms.location, cover_url: farms.cover_url }).from(farms).limit(3),
      db.select({ c: count() }).from(farms),
      db.select({ c: count() }).from(products),
      db.select({ c: count() }).from(group_orders).where(eq(group_orders.status, "open")),
    ]);
    return <Landing farms={teaser} stats={{ farms: f.c, products: p.c, groups: g.c }} />;
  }

  const [allFarms, diaryFeed, openGroups] = await Promise.all([
    db.select().from(farms).limit(6),
    // Join the farm so the feed never falls back to "Vườn rau" when a farm is outside the first 6.
    db.select({ entry: farm_diary, farm: { id: farms.id, name: farms.name, slug: farms.slug } })
      .from(farm_diary).leftJoin(farms, eq(farm_diary.farm_id, farms.id))
      .orderBy(desc(farm_diary.created_at)).limit(6),
    db.select({ group: group_orders, farm: { name: farms.name } })
      .from(group_orders).leftJoin(farms, eq(group_orders.farm_id, farms.id))
      .where(eq(group_orders.status, "open")).limit(3),
  ]);

  const features = [
    { icon: "visibility", title: "Thấy tận gốc", text: "Nhật ký canh tác mỗi ngày từ chính bác nông dân." },
    { icon: "local_shipping", title: "Tươi trong ngày", text: "Thu hoạch sáng, xe lạnh về phố, giao chiều." },
    { icon: "groups", title: "Gom đơn freeship", text: "Rủ hàng xóm cùng mua, đủ nhóm là miễn ship." },
  ];

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="m3-hero anim-in-scale">
        <span className="m3-hero-blob" style={{ width: 320, height: 320, right: -80, top: -120 }} />
        <span className="m3-hero-blob" style={{ width: 220, height: 220, right: 160, bottom: -120, animationDelay: "-5s" }} />
        <div style={{ position: "relative", maxWidth: 560 }}>
          <p className="m3-eyebrow anim-in" style={{ marginBottom: 12 }}>Chào {user.name?.split(" ").pop()}, hôm nay ăn gì?</p>
          <h1 className="display-md anim-in delay-1" style={{ color: "var(--md-on-primary-container)", marginBottom: 16 }}>
            Biết rõ từng cây rau trước khi lên bàn ăn
          </h1>
          <p className="body-lg anim-in delay-2" style={{ color: "var(--md-on-secondary-container)", maxWidth: 460, marginBottom: 28 }}>
            Đặt hàng trực tiếp từ vườn nhà bác Ba, cô Tư, u Thắm. Xem nhật ký canh tác hàng ngày, biết rau thu hoạch lúc nào và đến tay bạn ra sao.
          </p>
          <div className="flex flex-wrap gap-3 anim-in delay-3">
            <Link href="/farms" className="m3-btn m3-btn-filled m3-btn-lg">
              <Icon name="potted_plant" filled /><span>Khám phá vườn rau</span>
            </Link>
            <Link href="/gom-don" className="m3-btn m3-btn-elevated m3-btn-lg">
              <Icon name="groups" /><span>Gom đơn cùng hàng xóm</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger">
        {features.map((f, i) => (
          <div key={f.title} className="m3-card-filled lift" style={{ padding: "20px 22px", display: "flex", gap: 14, alignItems: "flex-start", background: i === 0 ? "var(--md-primary-container)" : i === 1 ? "var(--md-tertiary-container)" : "var(--md-secondary-container)", color: i === 0 ? "var(--md-on-primary-container)" : i === 1 ? "var(--md-on-tertiary-container)" : "var(--md-on-secondary-container)", borderRadius: "var(--shape-xl)" }}>
            <Icon name={f.icon} size={28} filled />
            <div>
              <p className="title-md">{f.title}</p>
              <p className="body-sm" style={{ opacity: 0.85 }}>{f.text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Farms */}
      <section>
        <div className="m3-section-head">
          <h2 className="headline-sm text-on-surface"><Icon name="potted_plant" filled /> Vườn rau nổi bật</h2>
          <Link href="/farms" className="m3-btn m3-btn-text m3-btn-sm"><span>Xem tất cả</span><Icon name="arrow_forward" size={18} /></Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {allFarms.map((farm) => (
            <Link key={farm.id} href={`/farms/${farm.slug}`} className="m3-card-elevated m3-card-action" style={{ borderRadius: "var(--shape-xl)" }}>
              <div className="m3-media-wrap" style={{ height: 170, position: "relative" }}>
                {farm.cover_url ? <SmartImage src={farm.cover_url} alt={farm.name} className="m3-card-media" style={{ position: "absolute", inset: 0 }} /> : <div style={{ position: "absolute", inset: 0, background: "var(--md-primary-container)" }} />}
                <span className="m3-chip sm round" style={{ position: "absolute", left: 12, bottom: 12, background: "rgba(0,0,0,.55)", color: "#fff", boxShadow: "none", backdropFilter: "blur(6px)" }}>
                  <Icon name="location_on" size={16} filled /> {farm.location}
                </span>
              </div>
              <div style={{ padding: "16px 18px 18px" }}>
                <p className="title-md text-on-surface" style={{ marginBottom: 4 }}>{farm.name}</p>
                <p className="body-sm text-on-surface-variant" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{farm.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Diary feed */}
      <section>
        <div className="m3-section-head">
          <h2 className="headline-sm text-on-surface"><Icon name="auto_stories" filled /> Nhật ký từ vườn</h2>
        </div>
        <div className="m3-list-group stagger">
          {diaryFeed.map(({ entry, farm }) => (
            <Link key={entry.id} href={`/nhat-ky/${entry.id}`} className="m3-list-item" style={{ alignItems: "flex-start", padding: 16 }}>
              {entry.media_urls[0] ? (
                <MediaGallery urls={entry.media_urls.slice(0, 1)} size={84} linkTo={`/nhat-ky/${entry.id}`} />
              ) : (
                <span className="m3-list-leading"><Icon name="eco" /></span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="label-md text-primary" style={{ marginBottom: 4 }}>{farm?.name ?? "Vườn rau"}</p>
                <p className="body-md text-on-surface" style={{ fontWeight: 400, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{entry.content}</p>
                <p className="body-sm text-on-surface-variant" style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="schedule" size={14} /> {timeAgo(entry.created_at)} · {formatDateTime(entry.created_at)}
                </p>
              </div>
              <span className="m3-list-trailing"><Icon name="chevron_right" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* Group buying */}
      {openGroups.length > 0 && (
        <section>
          <div className="m3-section-head">
            <h2 className="headline-sm text-on-surface"><Icon name="groups" filled /> Gom đơn đang mở</h2>
            <Link href="/gom-don" className="m3-btn m3-btn-text m3-btn-sm"><span>Xem tất cả</span><Icon name="arrow_forward" size={18} /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {openGroups.map(({ group, farm }) => {
              const pct = Math.min(100, Math.round((group.current_members / group.min_members) * 100));
              const freeship = group.current_members >= group.min_members;
              const left = daysUntil(group.deadline);
              return (
                <Link key={group.id} href={`/gom-don/${group.id}`} className="m3-card-elevated m3-card-action" style={{ padding: 20, borderRadius: "var(--shape-xl)" }}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div style={{ minWidth: 0 }}>
                      <p className="title-md text-on-surface" style={{ marginBottom: 2 }}>{group.title}</p>
                      <p className="body-sm text-on-surface-variant">{farm?.name}</p>
                    </div>
                    {freeship && <span className="m3-chip m3-chip-primary sm round"><Icon name="local_shipping" size={16} filled /> Freeship</span>}
                  </div>
                  <div className={`m3-progress ${freeship ? "" : "m3-progress-wavy"}`}>
                    <div className={`m3-progress-bar ${freeship ? "" : "secondary"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="body-sm text-on-surface-variant">{group.current_members}/{group.min_members} người</span>
                    <span className="body-sm" style={{ color: left <= 1 ? "var(--md-error)" : "var(--md-on-surface-variant)", fontWeight: 600 }}>
                      {left > 0 ? `Còn ${left} ngày` : "Chốt hôm nay"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
