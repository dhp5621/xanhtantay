import type { CSSProperties } from "react";

/**
 * Material Symbols Rounded icon.
 * Ligature names: https://fonts.google.com/icons
 */
export function Icon({
  name,
  size = 24,
  filled = false,
  bold = false,
  className = "",
  style,
  label,
}: {
  name: string;
  size?: number;
  filled?: boolean;
  bold?: boolean;
  className?: string;
  style?: CSSProperties;
  label?: string;
}) {
  const cls = ["msr", filled ? "filled" : "", bold ? "bold" : "", className].filter(Boolean).join(" ");
  return (
    <span
      className={cls}
      style={{ fontSize: size, ...style }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {name}
    </span>
  );
}
