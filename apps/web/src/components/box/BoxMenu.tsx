"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";
import type { BoxMealDay } from "@/db/schema";

/** Where a changed menu belongs: saved on an order, or only on screen for a box not bought yet. */
export type MenuTarget = { orderId: string } | { box: string };

/**
 * The menu that comes with a box: pick a day, see Trưa / Tối, open "Xem cách làm".
 * With `target` the customer can ask for another way to cook a meal, or for a whole new week.
 */
export function BoxMenu({ plan: initial, title = "Thực đơn theo ngày", target, customised: wasCustomised = false }: { plan: BoxMealDay[]; title?: string; target?: MenuTarget; customised?: boolean }) {
  const [plan, setPlan] = useState(initial);
  const [customised, setCustomised] = useState(wasCustomised);
  const [day, setDay] = useState(initial[0]?.day ?? 1);
  const [open, setOpen] = useState<string | null>(null);
  const [wish, setWish] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  // Every dish shown so far, so a new search never hands back one the customer already passed on.
  const seen = useRef(new Set(initial.flatMap((d) => d.meals.map((m) => m.title))));
  const { show } = useSnackbar();
  if (!plan.length) return null;
  const current = plan.find((d) => d.day === day) ?? plan[0];

  const change = async (key: string, body: Record<string, unknown>, done: (ai: boolean) => string) => {
    if (!target || busy) return;
    setBusy(key);
    try {
      const res = await fetch("/api/menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...("orderId" in target ? { order_id: target.orderId } : { box: target.box, plan }), seen: [...seen.current], ...body }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Chưa đổi được thực đơn, bạn thử lại nhé");
      (data.plan as BoxMealDay[]).forEach((d) => d.meals.forEach((m) => seen.current.add(m.title)));
      setPlan(data.plan);
      setCustomised(!!data.customised);
      show(done(!!data.ai), { kind: "success" });
      return true;
    } catch (e) {
      show(e instanceof Error ? e.message : "Có lỗi", { kind: "error", duration: 6000 });
    } finally {
      setBusy(null);
    }
  };
  const newWeek = () => change("week", { action: "week" }, (ai) => (ai ? "Đã lên thực đơn mới từ các công thức trên mạng" : "Đã đổi sang thực đơn khác của bếp nhà"));
  const reset = () => change("reset", { action: "reset" }, () => "Đã về thực đơn gốc của hộp");
  const newMeal = async (key: string, d: number, i: number) => {
    const ok = await change(key, { action: "meal", day: d, meal: i, wish: wish[key] ?? "" }, (ai) => (ai ? "Đã tìm được cách làm mới trên mạng" : "Đã đổi sang món khác của bếp nhà"));
    if (ok) setWish((w) => ({ ...w, [key]: "" }));
  };

  return (
    <section>
      <div className="m3-section-head">
        <h2 className="headline-sm text-on-surface"><Icon name="menu_book" filled /> {title}</h2>
        <span className="body-sm text-on-surface-variant">{plan.length} ngày · {plan.reduce((s, d) => s + d.meals.length, 0)} bữa</span>
      </div>
      {target && (
        <div className="m3-menu-swap">
          <button type="button" className="m3-btn m3-btn-filled m3-menu-swap-btn" onClick={newWeek} disabled={!!busy}>
            {busy === "week" ? <span className="m3-loader sm on-primary" /> : <Icon name="autorenew" />}
            <span>{busy === "week" ? "Đang tìm công thức mới trên mạng…" : "Đổi thực đơn cả tuần"}</span>
          </button>
          <p className="body-sm text-on-surface-variant">
            Chán thực đơn có sẵn? AI tìm công thức mới trên mạng, vẫn nấu từ đúng rau củ trong hộp.
            {customised && <> <button type="button" className="m3-link-btn" onClick={reset} disabled={!!busy}>Về thực đơn gốc</button></>}
          </p>
        </div>
      )}
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
                  {m.source && <p className="body-sm text-on-surface-variant" style={{ marginTop: 6, fontWeight: 400 }}><Icon name="travel_explore" size={14} /> Nguồn: {m.source}</p>}
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
                  {target && (
                    <form className="m3-menu-ask" onSubmit={(e) => { e.preventDefault(); newMeal(key, current.day, i); }}>
                      <label className="label-md text-on-surface-variant" htmlFor={`wish-${key}`} style={{ textTransform: "uppercase" }}>Tôi muốn cách làm khác</label>
                      <div className="m3-menu-ask-row">
                        <input id={`wish-${key}`} className="m3-input" value={wish[key] ?? ""} onChange={(e) => setWish((w) => ({ ...w, [key]: e.target.value }))} maxLength={200} placeholder="Ví dụ: ít dầu mỡ, kiểu Hàn, món đang hot, cho bé ăn…" disabled={!!busy} />
                        <button type="submit" className="m3-btn m3-btn-tonal-primary" disabled={!!busy}>
                          {busy === key ? <span className="m3-loader sm" /> : <Icon name="travel_explore" size={18} />}
                          <span>{busy === key ? "Đang tìm…" : "Tìm cách mới"}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
