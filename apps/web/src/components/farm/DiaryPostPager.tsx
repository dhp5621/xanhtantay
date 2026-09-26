"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { formatDateTime, timeAgo } from "@/lib/format";

export interface DiaryPost { id: string; content: string; media_urls: string[]; created_at: string }
interface FarmInfo { name: string; slug: string; location: string; farmerName?: string | null; farmerAvatar?: string | null }

/**
 * All posts of a farm as swipeable pages, oldest on the left, newest on the right.
 * Prev/next buttons everywhere, swipe on phones; the URL follows the visible post.
 */
export function DiaryPostPager({ posts, farm, initialId }: { posts: DiaryPost[]; farm: FarmInfo; initialId: string }) {
  const start = Math.max(0, posts.findIndex((p) => p.id === initialId));
  const [index, setIndex] = useState(start);
  const trackRef = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);

  const go = (i: number) => {
    const next = Math.max(0, Math.min(posts.length - 1, i));
    setIndex(next);
    const t = trackRef.current;
    if (t) { programmatic.current = true; t.scrollTo({ left: next * t.clientWidth, behavior: "smooth" }); setTimeout(() => { programmatic.current = false; }, 500); }
  };

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    t.scrollTo({ left: start * t.clientWidth, behavior: "auto" });
    const onScroll = () => { if (!programmatic.current) setIndex(Math.round(t.scrollLeft / t.clientWidth)); };
    t.addEventListener("scroll", onScroll, { passive: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") go(index - 1); if (e.key === "ArrowRight") go(index + 1); };
    document.addEventListener("keydown", onKey);
    return () => { t.removeEventListener("scroll", onScroll); document.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the address bar on the visible post so refresh / share point at it.
  useEffect(() => {
    const p = posts[index];
    if (p && location.pathname !== `/nhat-ky/${p.id}`) history.replaceState(null, "", `/nhat-ky/${p.id}`);
  }, [index, posts]);

  const current = posts[index];

  return (
    <div className="m3-pager">
      <div className="m3-pager-head">
        <p className="body-sm text-on-surface-variant">Bài {index + 1} / {posts.length} · {index === posts.length - 1 ? "mới nhất" : index === 0 ? "cũ nhất" : timeAgo(current.created_at)}</p>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button className="m3-icon-btn tonal" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Bài cũ hơn" title="Bài cũ hơn"><Icon name="chevron_left" /></button>
          <div className="m3-pager-dots" aria-hidden>
            {posts.length <= 12 && posts.map((p, i) => <button key={p.id} className={`m3-pager-dot ${i === index ? "active" : ""}`} onClick={() => go(i)} tabIndex={-1} />)}
          </div>
          <button className="m3-icon-btn tonal" onClick={() => go(index + 1)} disabled={index === posts.length - 1} aria-label="Bài mới hơn" title="Bài mới hơn"><Icon name="chevron_right" /></button>
        </div>
      </div>

      <div ref={trackRef} className="m3-pager-track" aria-live="polite">
        {posts.map((d, i) => {
          const paragraphs = d.content.split(/\n{2,}|\n/).map((x) => x.trim()).filter(Boolean);
          const near = Math.abs(i - index) <= 1; // only mount media for neighbours
          return (
            <div key={d.id} className="m3-pager-page" style={{ display: "block" }}>
              <article className="m3-card-elevated" style={{ borderRadius: "var(--shape-xl-inc)", overflow: "hidden" }}>
                <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px 12px" }}>
                  <Link href={`/farms/${farm.slug}`} style={{ display: "inline-flex", borderRadius: "var(--shape-full)" }}><Avatar name={farm.farmerName} src={farm.farmerAvatar} /></Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/farms/${farm.slug}`} className="title-md text-on-surface" style={{ textDecoration: "none", display: "block" }}>{farm.name}</Link>
                    <p className="body-sm text-on-surface-variant">{farm.farmerName} · <Icon name="location_on" size={12} filled /> {farm.location}</p>
                  </div>
                  <span className="m3-chip sm round m3-chip-surface" title={formatDateTime(d.created_at)}><Icon name="schedule" size={14} /> {timeAgo(d.created_at)}</span>
                </header>
                <div style={{ padding: "0 20px 16px" }}>
                  {paragraphs.map((p, k) => <p key={k} className="body-lg text-on-surface" style={{ lineHeight: 1.7, marginBottom: k < paragraphs.length - 1 ? 10 : 0 }}>{p}</p>)}
                </div>
                {d.media_urls.length > 0 && near && (
                  <div style={{ padding: "0 12px 12px" }}>
                    <MediaGallery urls={d.media_urls} caption={`${farm.name} · ${formatDateTime(d.created_at)}`} layout="post" />
                  </div>
                )}
                <footer style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "6px 20px 18px" }}>
                  <span className="body-sm text-on-surface-variant">{formatDateTime(d.created_at)}{d.media_urls.length ? ` · ${d.media_urls.length} ảnh/video` : ""}</span>
                  <span style={{ flex: 1 }} />
                  <Link href={`/farms/${farm.slug}#san-pham`} className="m3-btn m3-btn-filled m3-btn-sm"><Icon name="shopping_basket" size={18} filled /><span>Đặt rau từ vườn này</span></Link>
                </footer>
              </article>
            </div>
          );
        })}
      </div>
      <p className="body-sm text-on-surface-variant" style={{ textAlign: "center" }}>Vuốt hoặc dùng mũi tên: trái là bài cũ hơn, phải là bài mới hơn</p>
    </div>
  );
}
