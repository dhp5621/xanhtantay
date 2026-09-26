"use client";

import { useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { Icon } from "@/components/ui/Icon";
import { GOALS, DIET_TAGS, isDefaultPrefs } from "@/lib/recipe-prefs";
import type { RecipePrefs } from "@/db/schema";

/** Toggle button + settings dialog for goal / diet / servings / notes. Saved to the account on apply. */
export function RecipeSettings({ prefs, onChange, disabled }: { prefs: RecipePrefs; onChange: (p: RecipePrefs) => Promise<void> | void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [draft, setDraft] = useState<RecipePrefs>(prefs);
  const [saving, setSaving] = useState(false);
  const goal = GOALS.find((g) => g.value === prefs.goal)!;
  const active = !isDefaultPrefs(prefs);

  const show = () => { setDraft(prefs); setOpen(true); };
  const close = () => { setClosing(true); setTimeout(() => { setClosing(false); setOpen(false); }, 220); };
  const apply = async () => { setSaving(true); try { await onChange(draft); close(); } finally { setSaving(false); } };
  const toggleTag = (t: string) => setDraft((d) => ({ ...d, tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] }));

  return (
    <>
      <button type="button" className={`m3-btn m3-btn-lg ${active ? "m3-btn-tertiary" : "m3-btn-outlined"}`} onClick={show} disabled={disabled} aria-pressed={active} aria-haspopup="dialog" title="Tuỳ chọn thực đơn">
        <Icon name={active ? goal.icon : "tune"} filled={active} />
        <span>{active ? goal.label : "Tuỳ chọn"}</span>
        {active && (prefs.tags.length > 0 || prefs.customDiet) && <span className="m3-badge" style={{ position: "static", marginLeft: 2, border: "none", background: "var(--md-on-tertiary-container)", color: "var(--md-tertiary-container)" }}>{prefs.tags.length + (prefs.customDiet ? 1 : 0)}</span>}
      </button>

      {open && (
        <Portal>
          <div className={`m3-scrim ${closing ? "closing" : ""}`} onClick={close} aria-hidden />
          <div className={`m3-dialog ${closing ? "closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="rs-title">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <span className="m3-list-leading" style={{ background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)" }}><Icon name="tune" filled /></span>
              <div>
                <h2 id="rs-title" className="headline-sm">Tuỳ chọn thực đơn</h2>
                <p className="body-sm text-on-surface-variant">Lưu theo tài khoản, áp dụng cho mọi lần gợi ý</p>
              </div>
            </div>

            <p className="m3-label" style={{ marginBottom: 8 }}>Mục tiêu</p>
            <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 18 }}>
              {GOALS.map((g) => {
                const sel = draft.goal === g.value;
                return (
                  <button key={g.value} type="button" onClick={() => setDraft({ ...draft, goal: g.value })} aria-pressed={sel} className="m3-card-action lift" style={{ padding: "14px 10px", textAlign: "center", border: "none", borderRadius: "var(--shape-lg-inc)", background: sel ? "var(--md-tertiary-container)" : "var(--md-surface-container-highest)", color: sel ? "var(--md-on-tertiary-container)" : "var(--md-on-surface-variant)", boxShadow: sel ? "inset 0 0 0 2px var(--md-tertiary)" : "none" }}>
                    <Icon name={g.icon} size={28} filled={sel} />
                    <p className="title-sm" style={{ marginTop: 6 }}>{g.label}</p>
                    <p className="body-sm" style={{ opacity: 0.8 }}>{g.desc}</p>
                  </button>
                );
              })}
            </div>

            <p className="m3-label" style={{ marginBottom: 8 }}>Chế độ ăn</p>
            <div className="flex flex-wrap gap-2" style={{ marginBottom: 18 }}>
              {DIET_TAGS.map((t) => {
                const sel = draft.tags.includes(t.value);
                return (
                  <button key={t.value} type="button" className={`m3-chip ${sel ? "selected" : ""}`} onClick={() => toggleTag(t.value)} aria-pressed={sel}>
                    {sel && <Icon name="check" size={16} />} {t.label}
                  </button>
                );
              })}
            </div>

            <div className="m3-field" style={{ marginBottom: 18 }}>
              <label className="m3-field-label" htmlFor="rs-custom">Chế độ ăn tuỳ chỉnh</label>
              <input id="rs-custom" className="m3-input" placeholder="Ví dụ: keto, Địa Trung Hải, low FODMAP, ăn theo Eat Clean 1500 kcal…" value={draft.customDiet ?? ""} onChange={(e) => setDraft({ ...draft, customDiet: e.target.value })} maxLength={120} />
              <p className="body-sm text-on-surface-variant">Mô tả tự do; AI sẽ tuân theo cùng với mục tiêu và các thẻ ở trên.</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
              <p className="m3-label">Khẩu phần</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--md-primary-container)", color: "var(--md-on-primary-container)", borderRadius: "var(--shape-full)", padding: 3 }}>
                <button type="button" className="m3-icon-btn sm" onClick={() => setDraft({ ...draft, servings: Math.max(1, draft.servings - 1) })} aria-label="Bớt" style={{ background: "var(--md-surface-container-lowest)", color: "var(--md-on-surface)" }}><Icon name="remove" size={18} /></button>
                <span className="label-lg tabular" style={{ minWidth: 64, textAlign: "center" }}>{draft.servings} người</span>
                <button type="button" className="m3-icon-btn sm filled" onClick={() => setDraft({ ...draft, servings: Math.min(8, draft.servings + 1) })} aria-label="Thêm"><Icon name="add" size={18} /></button>
              </div>
            </div>

            <div className="m3-field" style={{ marginBottom: 6 }}>
              <label className="m3-field-label" htmlFor="rs-notes">Dị ứng / sở thích</label>
              <input id="rs-notes" className="m3-input" placeholder="Ví dụ: dị ứng đậu phộng, không ăn nội tạng…" value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} maxLength={200} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              <button type="button" className="m3-btn m3-btn-text" onClick={() => setDraft({ goal: "normal", tags: [], servings: 2, notes: "", customDiet: "" })}><Icon name="restart_alt" size={18} /><span>Mặc định</span></button>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="m3-btn m3-btn-text" onClick={close}>Huỷ</button>
                <button type="button" className="m3-btn m3-btn-filled" onClick={apply} disabled={saving}>{saving ? <span className="m3-loader sm on-primary" /> : <Icon name="check" />}<span>Áp dụng</span></button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
