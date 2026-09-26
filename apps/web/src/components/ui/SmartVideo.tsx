"use client";

import { useState } from "react";

/** Video thumbnail/preview with a loading placeholder instead of a black frame. */
export function SmartVideo({ src, controls = false, autoPlay = false, style, objectFit = "cover" }: { src: string; controls?: boolean; autoPlay?: boolean; style?: React.CSSProperties; objectFit?: "cover" | "contain" }) {
  const [ready, setReady] = useState(false);
  return (
    <span className={`m3-img ${ready ? "done" : "loading"}`} style={style}>
      {!ready && <span className="m3-img-ph" aria-hidden><span className="m3-loader sm" /></span>}
      <video
        src={src}
        muted={!controls}
        playsInline
        controls={controls}
        autoPlay={autoPlay}
        preload="metadata"
        onLoadedData={() => setReady(true)}
        onCanPlay={() => setReady(true)}
        style={{ width: "100%", height: "100%", objectFit, display: "block", opacity: ready ? 1 : 0, transition: "opacity var(--dur-medium-4) var(--ease-standard)" }}
      />
    </span>
  );
}
