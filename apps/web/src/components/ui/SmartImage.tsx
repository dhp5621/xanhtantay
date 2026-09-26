"use client";

import { useState } from "react";

/**
 * Image that shows a soft surface-toned placeholder with the M3 loader while loading,
 * then fades the picture in. Never a black box. Works for <img> and video posters.
 */
export function SmartImage({ src, alt = "", className = "", style, sizes, priority = false, objectFit = "cover" }: {
  src: string; alt?: string; className?: string; style?: React.CSSProperties; sizes?: string; priority?: boolean; objectFit?: "cover" | "contain";
}) {
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  return (
    <span className={`m3-img ${state} ${objectFit === "contain" ? "contain" : ""} ${className}`} style={style}>
      {state !== "done" && (
        <span className="m3-img-ph" aria-hidden>
          {state === "loading" ? <span className="m3-loader sm" /> : <span className="msr" style={{ fontSize: 28, opacity: 0.5 }}>broken_image</span>}
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setState("done")}
        onError={() => setState("error")}
        style={objectFit === "contain"
          ? { maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", display: "block", opacity: state === "done" ? 1 : 0, transition: "opacity var(--dur-medium-4) var(--ease-standard)" }
          : { width: "100%", height: "100%", objectFit, display: "block", opacity: state === "done" ? 1 : 0, transition: "opacity var(--dur-medium-4) var(--ease-standard)" }}
      />
    </span>
  );
}
