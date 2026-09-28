"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";

/** Thumbnails of the photos and the video sent as evidence; each opens large. */
export function Evidence({ photos, video }: { photos: string[]; video: string | null }) {
  const [open, setOpen] = useState<{ kind: "photo" | "video"; url: string } | null>(null);
  if (!photos.length && !video) return <p className="body-sm text-on-surface-variant">Không gửi ảnh hay video.</p>;
  return (
    <>
      <div className="m3-evidence">
        {photos.map((u, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <button key={u} type="button" className="m3-evidence-item" onClick={() => setOpen({ kind: "photo", url: u })} aria-label={`Xem ảnh ${i + 1}`}><img src={u} alt={`Ảnh bằng chứng ${i + 1}`} loading="lazy" /></button>
        ))}
        {video && <button type="button" className="m3-evidence-item video" onClick={() => setOpen({ kind: "video", url: video })} aria-label="Xem video"><video src={video} preload="metadata" muted playsInline /><span className="m3-evidence-play"><Icon name="play_arrow" filled /></span></button>}
      </div>
      {open && (
        <Portal>
          <div className="m3-scrim" onClick={() => setOpen(null)} aria-hidden />
          <div className="m3-evidence-view" role="dialog" aria-modal="true" aria-label="Bằng chứng">
            <button type="button" className="m3-icon-btn" onClick={() => setOpen(null)} aria-label="Đóng" style={{ position: "absolute", top: 8, right: 8, zIndex: 1, background: "rgba(0,0,0,.55)", color: "#fff" }}><Icon name="close" /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {open.kind === "photo" ? <img src={open.url} alt="Ảnh bằng chứng" /> : <video src={open.url} controls autoPlay playsInline />}
          </div>
        </Portal>
      )}
    </>
  );
}
