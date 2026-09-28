"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";
import { formatKg } from "@/lib/commerce";
import { formatClock } from "@/lib/format";

export interface Command { id: string; message: string; items: { name: string; kg: number }[]; total_kg: number; status: "sent" | "confirmed"; confirmed_at: string | Date | null; delivery_date: string }

/** The whole farmer interface: one message, one button. */
export function HarvestCommand({ command, dateLabel }: { command: Command; dateLabel: string }) {
  const [state, setState] = useState(command.status);
  const [at, setAt] = useState<string | Date | null>(command.confirmed_at);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useSnackbar();

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/farmer/commands/${command.id}/confirm`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Chưa xác nhận được, bác thử lại nhé");
      setState("confirmed"); setAt(data.confirmed_at ?? new Date().toISOString());
      show("Đã xác nhận. Hẹn bác 4h sáng mai!", { kind: "success" });
      router.refresh();
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error", duration: 6000 }); }
    finally { setBusy(false); }
  };

  const confirmed = state === "confirmed";
  return (
    <section className={`m3-command anim-in-scale ${confirmed ? "confirmed" : ""}`} aria-live="polite">
      <p className="label-lg" style={{ opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Icon name="agriculture" filled /> Lệnh thu hoạch · {dateLabel}
      </p>
      <p className="m3-command-text">{command.message}</p>

      <div className="flex flex-col gap-2" style={{ margin: "22px 0" }}>
        {command.items.map((it) => (
          <div key={it.name} className="m3-command-row"><span>{it.name}</span><span className="tabular">{formatKg(it.kg)}</span></div>
        ))}
        <div className="m3-command-row" style={{ background: "transparent", boxShadow: "inset 0 0 0 2px currentColor" }}><span>Tổng cộng</span><span className="tabular">{formatKg(command.total_kg)}</span></div>
      </div>

      {confirmed ? (
        <div className="m3-command-row" style={{ justifyContent: "center", background: "var(--md-primary)", color: "var(--md-on-primary)" }}>
          <Icon name="check_circle" size={32} filled /> <span>Đã xác nhận{at ? ` lúc ${formatClock(at)}` : ""}</span>
        </div>
      ) : (
        <button className="m3-btn m3-btn-filled m3-command-btn" onClick={confirm} disabled={busy}>
          {busy ? <span className="m3-loader on-primary" style={{ width: 32, height: 32 }} /> : <Icon name="thumb_up" filled />}
          <span>Đã hiểu & Xác nhận</span>
        </button>
      )}
    </section>
  );
}
