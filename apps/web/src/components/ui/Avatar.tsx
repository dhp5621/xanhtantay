import type { CSSProperties } from "react";

/** Initial-letter avatar that shows the user's picture when they have one. */
export function Avatar({ name, src, size = "md", className = "", style }: { name?: string | null; src?: string | null; size?: "sm" | "md" | "lg" | "xl"; className?: string; style?: CSSProperties }) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";
  const cls = `m3-avatar ${size === "md" ? "" : size} ${className}`.trim();
  if (src) {
    return (
      <span className={cls} style={{ overflow: "hidden", padding: 0, ...style }} aria-label={name ?? "Ảnh đại diện"} role="img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </span>
    );
  }
  return <span className={cls} style={style} aria-hidden>{initial}</span>;
}
