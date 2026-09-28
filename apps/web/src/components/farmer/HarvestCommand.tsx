"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";
import { formatKg } from "@/lib/commerce";
import { formatClock } from "@/lib/format";

export interface Command { id: string; message: string; items: { name: string; kg: number }[]; total_kg: number; status: "sent" | "confirmed" | "declined"; confirmed_at: string | Date | null; declined_at?: string | Date | null; delivery_date: string }

/** The whole farmer interface: one message, answered with Có or Không. */
export function HarvestCommand({ command, dateLabel, you = "bạn" }: { command: Command; dateLabel: string; /** How the farmer is addressed: "bác", "cô", "chú"… */ you?: string }) {
  const [state, setState] = useState(command.status);
  const [at, setAt] = useState<string | Date | null>(command.status === "declined" ? command.declined_at ?? null : command.confirmed_at);
  const [busy, setBusy] = useState<"confirm" | "decline" | null>(null);
  const router = useRouter();
  const { show } = useSnackbar();

  const answer = async (choice: "confirm" | "decline") => {
    setBusy(choice);
    try {
      const res = await fetch(`/api/farmer/commands/${command.id}/${choice}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Chưa gửi được, ${you} thử lại giúp nhé`);
      setState(data.status ?? (choice === "confirm" ? "confirmed" : "declined"));
      setAt((choice === "confirm" ? data.confirmed_at : data.declined_at) ?? new Date().toISOString());
      show(choice === "confirm" ? `Đã xác nhận. Hẹn ${you} 4h sáng mai ạ!` : `Đã báo điều phối là ${you} không cắt được ạ.`, { kind: choice === "confirm" ? "success" : "info" });
      router.refresh();
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error", duration: 6000 }); }
    finally { setBusy(null); }
  };

  const confirmed = state === "confirmed";
  const declined = state === "declined";
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
        <div className="flex flex-col gap-3">
          {declined && (
            <div className="m3-command-row" style={{ justifyContent: "center", background: "var(--md-error-container)", color: "var(--md-on-error-container)" }}>
              <Icon name="cancel" size={28} filled /> <span>{you.charAt(0).toUpperCase() + you.slice(1)} đã báo không cắt được{at ? ` lúc ${formatClock(at)}` : ""}</span>
            </div>
          )}
          <button className="m3-btn m3-btn-filled m3-command-btn" onClick={() => answer("confirm")} disabled={!!busy}>
            {busy === "confirm" ? <span className="m3-loader on-primary" style={{ width: 32, height: 32 }} /> : <Icon name="thumb_up" filled />}
            <span>{declined ? "Tôi cắt được, xác nhận lại" : "Có · Đã hiểu & Xác nhận"}</span>
          </button>
          {!declined && (
            <button className="m3-btn m3-btn-outlined m3-command-btn m3-command-no" onClick={() => answer("decline")} disabled={!!busy}>
              {busy === "decline" ? <span className="m3-loader" style={{ width: 28, height: 28 }} /> : <Icon name="cancel" />}
              <span>Không · Tôi không cắt được</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
