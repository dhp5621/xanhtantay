import { ORDER_TIMELINE, type OrderStatus } from "@xanhtantay/types";
import { Icon } from "@/components/ui/Icon";
import { formatClock } from "@/lib/format";

/**
 * Emotional tracking: four steps with their clock times.
 * "4h00: Rau đang được bác Tư thu hoạch" → "6h00: Hàng lên xe lạnh về phố" → "16h00: Rau quê đã có tại điểm nhận".
 */
export function OrderTimeline({ status, farmer, times, allocated, compact = false }: {
  status: OrderStatus; farmer?: string | null; allocated?: boolean; compact?: boolean;
  times?: { placed?: Date | string | null; harvested?: Date | string | null; loaded?: Date | string | null; delivered?: Date | string | null };
}) {
  if (status === "cancelled") {
    return <p className="status-pill status-cancelled"><Icon name="cancel" size={16} filled /> Đơn đã huỷ trước giờ chốt sổ</p>;
  }
  const idx = ORDER_TIMELINE.findIndex((s) => s.status === status);
  const real = [times?.placed, times?.harvested, times?.loaded, times?.delivered];

  if (compact) {
    return (
      <div className="flex items-center" style={{ padding: "0 4px" }} aria-label="Hành trình hộp rau">
        {ORDER_TIMELINE.map((s, i) => (
          <div key={s.status} style={{ display: "contents" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 64 }}>
              <span className={`m3-step-dot ${i < idx ? "done" : ""} ${i === idx ? "current" : ""}`}>{i < idx ? <Icon name="check" size={20} bold /> : <Icon name={s.icon} size={20} filled={i === idx} />}</span>
              <span className="label-sm tabular" style={{ color: i <= idx ? "var(--md-primary)" : "var(--md-on-surface-variant)", letterSpacing: 0 }}>{s.time.replace(":00", "h00")}</span>
              <span className="body-sm" style={{ color: i <= idx ? "var(--md-on-surface)" : "var(--md-on-surface-variant)", fontSize: 11, textAlign: "center" }}>{s.short}</span>
            </div>
            {i < ORDER_TIMELINE.length - 1 && <div className={`m3-step-line ${i < idx ? "done" : ""}`} style={{ marginBottom: 40 }} />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ol className="m3-timeline" aria-label="Hành trình hộp rau">
      {ORDER_TIMELINE.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "todo";
        const at = real[i];
        const label = i === 0 && allocated ? "Đã chốt sổ, lệnh thu hoạch đã gửi về vườn" : s.label(farmer ?? undefined);
        return (
          <li key={s.status} className={`m3-timeline-item ${state}`}>
            <span className="m3-timeline-dot">{state === "done" ? <Icon name="check" size={18} bold /> : <Icon name={s.icon} size={18} filled={state === "current"} />}</span>
            <div>
              <p className="label-lg tabular" style={{ color: state === "todo" ? "var(--md-on-surface-variant)" : "var(--md-primary)" }}>{at && state !== "todo" && i > 0 ? formatClock(at).replace(/^0/, "").replace(":", "h") : s.time.replace(":00", "h00")}</p>
              <p className={state === "current" ? "title-md text-on-surface" : "body-md"} style={{ color: state === "todo" ? "var(--md-on-surface-variant)" : undefined }}>{label}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
