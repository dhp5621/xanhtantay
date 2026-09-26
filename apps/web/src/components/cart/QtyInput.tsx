"use client";

import { useEffect, useState } from "react";

/**
 * Editable quantity inside a stepper. Enter or blur commits; 0 (or empty) means remove.
 * Keeps local text state so the user can clear the field while typing.
 */
export function QtyInput({
  value,
  onCommit,
  max,
  bump = false,
  color,
  width = 40,
}: {
  value: number;
  onCommit: (qty: number) => void;
  max?: number;
  bump?: boolean;
  color?: string;
  width?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const n = Math.floor(Number(text));
    if (!Number.isFinite(n) || n <= 0) { onCommit(0); return; }
    onCommit(max !== undefined ? Math.min(n, max) : Math.min(n, 100));
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={max ?? 100}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
        if (e.key === "Escape") { setText(String(value)); (e.target as HTMLInputElement).blur(); }
      }}
      onFocus={(e) => e.target.select()}
      aria-label="Số lượng"
      className={`tabular ${bump ? "m3-bump" : ""}`}
      style={{
        width,
        textAlign: "center",
        fontWeight: 700,
        fontSize: 14,
        background: "transparent",
        border: "none",
        outline: "none",
        color: color ?? "inherit",
        padding: 0,
        MozAppearance: "textfield",
      }}
    />
  );
}
