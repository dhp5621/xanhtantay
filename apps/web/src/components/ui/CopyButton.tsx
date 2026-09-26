"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { useSnackbar } from "./Snackbar";

export function CopyButton({ text, label = "Sao chép" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { show } = useSnackbar();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      show("Đã sao chép liên kết", { kind: "success", duration: 2000 });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      show("Không sao chép được, hãy chọn và copy thủ công", { kind: "error" });
    }
  };
  return (
    <button className={`m3-btn ${copied ? "m3-btn-filled" : "m3-btn-tonal"}`} onClick={copy} style={{ whiteSpace: "nowrap" }}>
      <Icon name={copied ? "check" : "content_copy"} size={18} className={copied ? "m3-check-in" : ""} />
      <span>{copied ? "Đã chép" : label}</span>
    </button>
  );
}
