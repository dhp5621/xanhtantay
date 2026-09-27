"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

/**
 * Video thumbnail/preview with a loading placeholder instead of a black frame.
 * With preload="metadata" browsers fire `loadedmetadata` but often neither `loadeddata` nor
 * `canplay` until playback starts, and Safari/Chrome only paint a first frame after a seek —
 * so the thumbnail seeks to t≈0 and reveals on `seeked`/`loadeddata`, with a timeout as a last resort.
 */
export function SmartVideo({ src, controls = false, autoPlay = false, style, objectFit = "cover" }: { src: string; controls?: boolean; autoPlay?: boolean; style?: React.CSSProperties; objectFit?: "cover" | "contain" }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (v.readyState >= 2) setReady(true);
    const t = setTimeout(() => setReady(true), 4000);
    return () => clearTimeout(t);
  }, [src]);

  const reveal = () => setReady(true);
  const onMeta = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.readyState >= 2) { reveal(); return; }
    // Force the first frame to decode; `seeked` then reveals the thumbnail.
    if (!controls && !autoPlay) { try { v.currentTime = 0.001; } catch { reveal(); } }
  };

  return (
    <span className={`m3-img ${ready ? "done" : "loading"} ${objectFit === "contain" ? "contain" : ""}`} style={style}>
      {!ready && !failed && <span className="m3-img-ph" aria-hidden><span className="m3-loader sm" /></span>}
      {failed && <span className="m3-img-ph" aria-hidden style={{ background: "var(--md-surface-container-highest)" }}><Icon name="videocam" size={32} className="text-on-surface-variant" /></span>}
      <video
        ref={ref}
        src={controls || autoPlay ? src : `${src}#t=0.001`}
        muted={!controls}
        playsInline
        controls={controls}
        autoPlay={autoPlay}
        preload="metadata"
        onLoadedMetadata={onMeta}
        onLoadedData={reveal}
        onSeeked={reveal}
        onCanPlay={reveal}
        onError={() => { setFailed(true); setReady(true); }}
        style={objectFit === "contain"
          ? { maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", display: "block", opacity: ready && !failed ? 1 : 0, transition: "opacity var(--dur-medium-4) var(--ease-standard)" }
          : { width: "100%", height: "100%", objectFit, display: "block", opacity: ready && !failed ? 1 : 0, transition: "opacity var(--dur-medium-4) var(--ease-standard)" }}
      />
    </span>
  );
}
