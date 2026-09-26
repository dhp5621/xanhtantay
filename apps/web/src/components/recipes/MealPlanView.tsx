"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";
import type { MealPlanDay, RecipePrefs } from "@/db/schema";
import { RecipeSettings } from "./RecipeSettings";
import { GOALS, isDefaultPrefs } from "@/lib/recipe-prefs";

interface Plan { id: string; days: number; summary: string | null; plan: MealPlanDay[]; source: string; created_at: Date | string }

export function MealPlanView({ orderId, delivered, inventory, initial, initialPrefs }: { orderId: string; delivered: boolean; inventory: { name: string; qty: number; unit: string }[]; initial: Plan | null; initialPrefs: RecipePrefs }) {
  const [plan, setPlan] = useState<Plan | null>(initial);
  const [prefs, setPrefs] = useState<RecipePrefs>(initialPrefs);
  const [prefsChanged, setPrefsChanged] = useState(false);

  // Same settings as the recipe assistant: saved on the account, so both pages stay in sync.
  const savePrefs = async (p: RecipePrefs) => {
    setPrefs(p);
    setPrefsChanged(!!plan);
    const res = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipe_prefs: p }) });
    if (!res.ok) show("Không lưu được tuỳ chọn, nhưng vẫn áp dụng cho lần này", { kind: "error" });
    else show(plan ? "Đã lưu. Bấm “Lên lại kế hoạch” để áp dụng cho kế hoạch này." : "Đã lưu tuỳ chọn thực đơn", { kind: "success", duration: 2500 });
  };
  const [busy, setBusy] = useState(false);
  const [openDay, setOpenDay] = useState(1);
  const [howTo, setHowTo] = useState<Record<string, "loading" | "open">>({});

  const showHowTo = async (day: number, mealIdx: number) => {
    if (!plan) return;
    const key = `${day}-${mealIdx}`;
    const meal = plan.plan.find((d) => d.day === day)?.meals[mealIdx];
    if (meal?.recipe) { setHowTo((h) => ({ ...h, [key]: h[key] === "open" ? undefined as never : "open" })); return; }
    setHowTo((h) => ({ ...h, [key]: "loading" }));
    try {
      const res = await fetch("/api/recipes/plan/meal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_id: plan.id, day, meal: mealIdx }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không lấy được cách làm");
      setPlan((p) => p && ({ ...p, plan: p.plan.map((d) => (d.day !== day ? d : { ...d, meals: d.meals.map((m, i) => (i === mealIdx ? { ...m, recipe: data } : m)) })) }));
      setHowTo((h) => ({ ...h, [key]: "open" }));
    } catch (e) {
      show(e instanceof Error ? e.message : "Có lỗi", { kind: "error" });
      setHowTo((h) => { const c = { ...h }; delete c[key]; return c; });
    }
  };
  const { show } = useSnackbar();

  const build = async (regenerate = false) => {
    setBusy(true);
    try {
      const res = await fetch("/api/recipes/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: orderId, regenerate, prefs }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không lên kế hoạch được");
      setPlan(data); setOpenDay(1); setPrefsChanged(false);
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
            <>
              <button className={`m3-btn m3-btn-lg ${prefsChanged ? "m3-btn-tertiary" : "m3-btn-filled"}`} onClick={() => build(!!plan)} disabled={busy}>
                {busy ? <span className="m3-loader sm on-primary" /> : <Icon name="auto_awesome" filled />}<span>{busy ? "Đang tính…" : plan ? "Lên lại kế hoạch" : "Lên kế hoạch ăn"}</span>
              </button>
              <RecipeSettings prefs={prefs} onChange={savePrefs} disabled={busy} />
            </>
          )}
          {plan && <span className="m3-chip sm round m3-chip-tertiary"><Icon name="event_available" size={16} /> Đủ ăn {plan.plan.length} ngày · {plan.plan.reduce((s, d) => s + d.meals.length, 0)} bữa</span>}
        </div>
        {!isDefaultPrefs(prefs) && (
          <p className="body-sm" style={{ color: "var(--md-on-secondary-container)", marginTop: 10 }}>
            <Icon name={GOALS.find((g) => g.value === prefs.goal)?.icon ?? "tune"} size={14} /> Đang áp dụng: {GOALS.find((g) => g.value === prefs.goal)?.label}{prefs.tags.length ? ` · ${prefs.tags.length} chế độ ăn` : ""}{prefs.customDiet ? ` · ${prefs.customDiet}` : ""} · {prefs.servings} người{prefsChanged ? " — tuỳ chọn mới, kế hoạch hiện tại chưa áp dụng" : ""}
          </p>
        )}
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
                {d.meals.map((m, i) => {
                  const key = `${d.day}-${i}`;
                  const state = howTo[key];
                  return (
                    <div key={i} className="m3-list-item" style={{ cursor: "default", alignItems: "flex-start", background: "var(--md-surface-container-lowest)", flexDirection: "column" }}>
                      <div className="m3-meal-row">
                        <span className="m3-list-leading"><Icon name={m.time.toLowerCase().includes("sáng") ? "wb_twilight" : m.time.toLowerCase().includes("tối") ? "bedtime" : "wb_sunny"} filled /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="label-md text-on-surface-variant" style={{ textTransform: "uppercase" }}>{m.time}</p>
                          <p className="title-md text-on-surface">{m.title}</p>
                          {m.uses.length > 0 && <div className="flex flex-wrap gap-1" style={{ marginTop: 6 }}>{m.uses.map((u, k) => <span key={k} className="m3-chip sm m3-chip-surface">{u}</span>)}</div>}
                          {m.note && <p className="body-sm text-on-surface-variant" style={{ marginTop: 6, fontWeight: 400 }}><Icon name="lightbulb" size={14} /> {m.note}</p>}
                        </div>
                        <button className={`m3-btn m3-btn-sm m3-meal-howto ${state === "open" ? "m3-btn-tonal" : "m3-btn-tonal-primary"}`} onClick={() => showHowTo(d.day, i)} disabled={state === "loading"}>
                          {state === "loading" ? <span className="m3-loader sm" /> : <Icon name={state === "open" ? "expand_less" : "menu_book"} size={18} />}
                          <span>{state === "loading" ? "Đang viết…" : state === "open" ? "Thu gọn" : "Xem cách làm"}</span>
                        </button>
                      </div>
                      {state === "open" && m.recipe && (
                        <div className="anim-in m3-meal-recipe">
                          {m.recipe.minutes && <p className="body-sm text-on-surface-variant" style={{ marginBottom: 8 }}><Icon name="schedule" size={14} /> Khoảng {m.recipe.minutes} phút</p>}
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
              {d.leftover && <p className="body-sm text-on-surface-variant" style={{ marginTop: 10 }}><Icon name="inventory_2" size={14} /> Còn lại: {d.leftover}</p>}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
