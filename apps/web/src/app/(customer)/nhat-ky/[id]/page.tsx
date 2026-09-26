export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { farm_diary, farms, users } from "@/db/schema";
import { Icon } from "@/components/ui/Icon";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { Avatar } from "@/components/ui/Avatar";
import { formatDateTime, timeAgo } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select({ content: farm_diary.content, farm: farms.name }).from(farm_diary).leftJoin(farms, eq(farm_diary.farm_id, farms.id)).where(eq(farm_diary.id, id));
  return { title: row ? `${row.farm} · ${row.content.slice(0, 60)}` : "Nhật ký vườn" };
}

/** One diary entry as a full post: farm header, complete text, every photo/video, and more posts from the farm. */
export default async function NhatKyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select({ d: farm_diary, farm: farms, farmer: { name: users.name, avatar_url: users.avatar_url } })
    .from(farm_diary).leftJoin(farms, eq(farm_diary.farm_id, farms.id)).leftJoin(users, eq(farms.owner_id, users.id)).where(eq(farm_diary.id, id));
  if (!row || !row.farm) notFound();
  const { d, farm, farmer } = row;
  const more = await db.select().from(farm_diary).where(and(eq(farm_diary.farm_id, farm.id), ne(farm_diary.id, id))).orderBy(desc(farm_diary.created_at)).limit(4);
  const paragraphs = d.content.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <Link href={`/farms/${farm.slug}`} className="m3-btn m3-btn-text m3-btn-sm anim-in" style={{ alignSelf: "flex-start", marginLeft: -12 }}><Icon name="arrow_back" size={18} /><span>{farm.name}</span></Link>

      <article className="m3-card-elevated anim-in-scale" style={{ borderRadius: "var(--shape-xl-inc)", overflow: "hidden" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px 12px" }}>
          <Link href={`/farms/${farm.slug}`} style={{ display: "inline-flex", borderRadius: "var(--shape-full)" }}><Avatar name={farmer?.name} src={farmer?.avatar_url} /></Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link href={`/farms/${farm.slug}`} className="title-md text-on-surface" style={{ textDecoration: "none", display: "block" }}>{farm.name}</Link>
            <p className="body-sm text-on-surface-variant">{farmer?.name} · <Icon name="location_on" size={12} filled /> {farm.location}</p>
          </div>
          <span className="m3-chip sm round m3-chip-surface" title={formatDateTime(d.created_at)}><Icon name="schedule" size={14} /> {timeAgo(d.created_at)}</span>
        </header>

        <div style={{ padding: "0 20px 16px" }}>
          {paragraphs.map((p, i) => <p key={i} className="body-lg text-on-surface" style={{ lineHeight: 1.7, marginBottom: i < paragraphs.length - 1 ? 10 : 0 }}>{p}</p>)}
        </div>

        {d.media_urls.length > 0 && (
          <div style={{ padding: "0 12px 12px" }}>
            <PostMedia urls={d.media_urls} caption={`${farm.name} · ${formatDateTime(d.created_at)}`} />
          </div>
        )}

        <footer style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "6px 20px 18px" }}>
          <span className="body-sm text-on-surface-variant">{formatDateTime(d.created_at)}{d.media_urls.length ? ` · ${d.media_urls.length} ảnh/video` : ""}</span>
          <span style={{ flex: 1 }} />
          <Link href={`/farms/${farm.slug}#san-pham`} className="m3-btn m3-btn-filled m3-btn-sm"><Icon name="shopping_basket" size={18} filled /><span>Đặt rau từ vườn này</span></Link>
        </footer>
      </article>

      {more.length > 0 && (
        <section className="anim-in delay-2">
          <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="auto_stories" filled /> Bài khác từ {farm.name}</h2></div>
          <div className="m3-list-group stagger">
            {more.map((e) => (
              <Link key={e.id} href={`/nhat-ky/${e.id}`} className="m3-list-item" style={{ alignItems: "flex-start" }}>
                {e.media_urls[0] ? (
                  <span className="m3-media-wrap" style={{ width: 64, height: 64, borderRadius: "var(--shape-md)", flexShrink: 0, display: "block" }}>
                    {/\.(mp4|webm|mov)(\?|$)/i.test(e.media_urls[0]) ? <video src={e.media_urls[0]} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="m3-card-media" style={{ display: "block", width: "100%", height: "100%", backgroundImage: `url(${e.media_urls[0]})` }} />}
                  </span>
                ) : <span className="m3-list-leading"><Icon name="eco" /></span>}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="body-md" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontWeight: 400 }}>{e.content}</span>
                  <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{timeAgo(e.created_at)}</span>
                </span>
                <span className="m3-list-trailing"><Icon name="chevron_right" /></span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Post-style media block: 1 item full width, 2 side by side, 3+ as a grid; each opens the lightbox. */
function PostMedia({ urls, caption }: { urls: string[]; caption: string }) {
  return <MediaGallery urls={urls} caption={caption} size={urls.length === 1 ? 0 : urls.length === 2 ? 2 : 3} layout="post" />;
}
