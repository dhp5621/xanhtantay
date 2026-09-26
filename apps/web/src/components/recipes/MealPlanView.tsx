"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";
import type { MealPlanDay } from "@/db/schema";

interface Plan { id: string; days: number; summary: string | null; plan: MealPlanDay[]; source: string; created_at: Date | string }

export function MealPlanView({ orderId, delivered, inventory, initial }: { orderId: string; delivered: boolean; inventory: { name: string; qty: number; unit: string }[]; initial: Plan | null }) {
  const [plan, setPlan] = useState<Plan | null>(initial);
  const [busy, setBusy] = useState(false);
  const [openDay, setOpenDay] = useState(1);
  const { show } = useSnackbar();

  const build = async (regenerate = false) => {
    setBusy(true);
    try {
      const res = await fetch("/api/recipes/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: orderId, regenerate }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không lên kế hoạch được");
      setPlan(data); setOpenDay(1);
      show(data.source === "ai" ? `Đủ ăn ${data.days} ngày, đã xếp lịch nấu` : `Ước tính ${data.days} ngày (chưa bật AI, lịch cơ bản)`, { kind: "success" });
    } catch (e) {
      show(e instanceof Error ? e.message : "Có lỗi", { kind: "error", duration: 6000 });
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="m3-hero anim-in-scale" style={{ padding: "20px 24px", borderRadius: "var(--shape-xl-inc)" }}>
        <p className="label-md" style={{ color: "var(--md-on-primary-container)", opacity: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Trong đơn</p>
        <div className="flex flex-wrap gap-2 stagger">
          {inventory.map((i) => <span key={i.name} className="m3-chip round" style={{ background: "var(--md-surface-container-lowest)", boxShadow: "none" }}><Icon name="eco" size={16} filled className="text-primary" /> <strong>{i.qty} {i.unit}</strong>&nbsp;{i.name}</span>)}
        </div>
        <div className="flex flex-wrap gap-2 items-center" style={{ marginTop: 16 }}>
          {!delivered ? (
            <p className="body-md" style={{ color: "var(--md-on-primary-container)" }}>Đơn chưa giao đến bạn. Rau về tới cửa là lên được kế hoạch.</p>
          ) : (
            <button className="m3-btn m3-btn-filled m3-btn-lg" onClick={() => build(!!plan)} disabled={busy}>
              {busy ? <span className="m3-loader sm on-primary" /> : <Icon name="auto_awesome" filled />}<span>{busy ? "Đang tính…" : plan ? "Lên lại kế hoạch" : "Lên kế hoạch ăn"}</span>
            </button>
          )}
          {plan && <span className="m3-chip sm round m3-chip-tertiary"><Icon name="event_available" size={16} /> Đủ ăn {plan.days} ngày</span>}
        </div>
      </section>

      {plan && (
        <>
          {plan.summary && <p className="body-lg text-on-surface anim-in" style={{ lineHeight: 1.6 }}>{plan.summary}</p>}
          <div className="m3-carousel anim-in delay-1">
            {plan.plan.map((d) => (
              <button key={d.day} type="button" onClick={() => setOpenDay(d.day)} className="m3-carousel-item m3-card-elevated" style={{ flexBasis: "min(240px, 70vw)", padding: 16, borderRadius: "var(--shape-xl)", textAlign: "left", border: "none", cursor: "pointer", background: openDay === d.day ? "var(--md-primary-container)" : undefined, color: openDay === d.day ? "var(--md-on-primary-container)" : "inherit" }}>
                <p className="label-md" style={{ opacity: 0.8, textTransform: "uppercase" }}>Ngày {d.day}</p>
                {d.meals.map((m, i) => <p key={i} className="title-sm" style={{ marginTop: 4 }}><span style={{ opacity: 0.7 }}>{m.time}:</span> {m.title}</p>)}
              </button>
            ))}
          </div>
          {plan.plan.filter((d) => d.day === openDay).map((d) => (
            <section key={d.day} className="m3-card-filled anim-in" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}>
              <h2 className="headline-sm text-on-surface" style={{ marginBottom: 12 }}>Ngày {d.day}</h2>
              <div className="m3-list-group">
                {d.meals.map((m, i) => (
                  <div key={i} className="m3-list-item" style={{ cursor: "default", alignItems: "flex-start", background: "var(--md-surface-container-lowest)" }}>
                    <span className="m3-list-leading"><Icon name={m.time.toLowerCase().includes("sáng") ? "wb_twilight" : m.time.toLowerCase().includes("tối") ? "bedtime" : "wb_sunny"} filled /></span>
                    <div style={{ flex: 1 }}>
                      <p className="label-md text-on-surface-variant" style={{ textTransform: "uppercase" }}>{m.time}</p>
                      <p className="title-md text-on-surface">{m.title}</p>
                      {m.uses.length > 0 && <div className="flex flex-wrap gap-1" style={{ marginTop: 6 }}>{m.uses.map((u, k) => <span key={k} className="m3-chip sm m3-chip-surface">{u}</span>)}</div>}
                      {m.note && <p className="body-sm text-on-surface-variant" style={{ marginTop: 6, fontWeight: 400 }}><Icon name="lightbulb" size={14} /> {m.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {d.leftover && <p className="body-sm text-on-surface-variant" style={{ marginTop: 10 }}><Icon name="inventory_2" size={14} /> Còn lại: {d.leftover}</p>}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
