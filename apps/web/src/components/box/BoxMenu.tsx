"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { BoxMealDay } from "@/db/schema";

/** The menu that comes with a box: pick a day, see Trưa / Tối, open "Xem cách làm". */
export function BoxMenu({ plan, title = "Thực đơn theo ngày" }: { plan: BoxMealDay[]; title?: string }) {
  const [day, setDay] = useState(plan[0]?.day ?? 1);
  const [open, setOpen] = useState<string | null>(null);
  if (!plan.length) return null;
  const current = plan.find((d) => d.day === day) ?? plan[0];

  return (
    <section>
      <div className="m3-section-head">
        <h2 className="headline-sm text-on-surface"><Icon name="menu_book" filled /> {title}</h2>
        <span className="body-sm text-on-surface-variant">{plan.length} ngày · {plan.reduce((s, d) => s + d.meals.length, 0)} bữa</span>
      </div>
      <div className="m3-button-group" style={{ display: "flex", width: "100%", marginBottom: 14 }}>
        {plan.map((d) => (
          <button key={d.day} type="button" className={`m3-seg ${d.day === current.day ? "selected" : ""}`} onClick={() => { setDay(d.day); setOpen(null); }} aria-pressed={d.day === current.day}>Ngày {d.day}</button>
        ))}
      </div>
      <div className="m3-list-group">
        {current.meals.map((m, i) => {
          const key = `${current.day}-${i}`;
          const expanded = open === key;
          return (
            <div key={key} className="m3-list-item" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch" }}>
              <div className="m3-meal-row">
                <span className="m3-list-leading"><Icon name={m.time === "Tối" ? "bedtime" : "wb_sunny"} filled /></span>
                <div style={{ minWidth: 0 }}>
                  <p className="label-md text-on-surface-variant" style={{ textTransform: "uppercase" }}>{m.time}{m.recipe.minutes ? ` · ${m.recipe.minutes} phút` : ""}</p>
                  <p className="title-md text-on-surface">{m.title}</p>
                  <div className="flex flex-wrap gap-1" style={{ marginTop: 6 }}>{m.uses.map((u) => <span key={u} className="m3-chip sm m3-chip-primary"><Icon name="eco" size={14} filled /> {u}</span>)}</div>
                  {m.note && <p className="body-sm text-on-surface-variant" style={{ marginTop: 6, fontWeight: 400 }}><Icon name="lightbulb" size={14} /> {m.note}</p>}
                </div>
                <button className={`m3-btn m3-btn-sm m3-meal-howto ${expanded ? "m3-btn-tonal" : "m3-btn-tonal-primary"}`} onClick={() => setOpen(expanded ? null : key)} aria-expanded={expanded}>
                  <Icon name={expanded ? "expand_less" : "menu_book"} size={18} /><span>{expanded ? "Thu gọn" : "Xem cách làm"}</span>
                </button>
              </div>
              {expanded && (
                <div className="anim-in m3-meal-recipe">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                      <p className="label-md text-on-surface-variant" style={{ marginBottom: 6, textTransform: "uppercase" }}>Nguyên liệu</p>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        {m.recipe.ingredients.map((ing, k) => <li key={k} className="body-md" style={{ fontWeight: 400, display: "flex", gap: 8 }}><Icon name="circle" size={8} className="text-primary" style={{ marginTop: 7 }} /><span>{ing}</span></li>)}
                      </ul>
                    </div>
                    <div className="md:col-span-3">
                      <p className="label-md text-on-surface-variant" style={{ marginBottom: 6, textTransform: "uppercase" }}>Cách làm</p>
                      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                        {m.recipe.steps.map((s, k) => <li key={k} className="body-md text-on-surface" style={{ display: "flex", gap: 10, fontWeight: 400, lineHeight: 1.55 }}><span className="m3-step-dot done" style={{ width: 24, height: 24, fontSize: 11, flexShrink: 0 }}>{k + 1}</span><span>{s}</span></li>)}
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
