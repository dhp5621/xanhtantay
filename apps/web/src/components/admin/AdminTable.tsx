"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { useSnackbar } from "@/components/ui/Snackbar";
import type { Section, Field } from "@/lib/admin-config";

type Row = Record<string, unknown> & { id: string };
export interface Column { key: string; label: string; mono?: boolean; clamp?: boolean }
type Lookups = Record<string, { value: string; label: string }[]>;

const toInput = (f: Field, v: unknown) => {
  if (v === null || v === undefined) return f.type === "boolean" ? false : "";
  if (f.type === "date") return new Date(v as string).toISOString().slice(0, 10);
  if (f.type === "list") return Array.isArray(v) ? v.join("\n") : String(v);
  if (f.type === "boolean") return !!v;
  return String(v);
};

export function AdminTable({ section, rows, columns, lookups }: { section: Section; rows: Row[]; columns: Column[]; lookups?: Lookups }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [confirm, setConfirm] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useSnackbar();
  const createFields = section.createFields ?? section.fields;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(s)));
  }, [rows, q]);

  const open = (r: Row | "new") => {
    const fields = r === "new" ? createFields : section.fields;
    setForm(Object.fromEntries(fields.map((f) => [f.key, toInput(f, r === "new" ? (f.type === "number" ? 0 : "") : r[f.key])])));
    setEditing(r);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const isNew = editing === "new";
      const res = await fetch(`/api/admin/${section.key}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? form : { id: (editing as Row).id, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không lưu được");
      show(isNew ? "Đã tạo" : "Đã lưu", { kind: "success", duration: 2000 });
      setEditing(null);
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Lỗi", { kind: "error" });
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/${section.key}?id=${encodeURIComponent(confirm.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không xoá được");
      show("Đã xoá", { kind: "success", duration: 2000 });
      setConfirm(null);
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Lỗi", { kind: "error" });
    } finally { setBusy(false); }
  };

  /** Quick inline change for select/boolean fields without opening the dialog. */
  const quick = async (row: Row, key: string, value: unknown) => {
    const res = await fetch(`/api/admin/${section.key}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, [key]: value }) });
    if (!res.ok) show((await res.json().catch(() => ({})))?.error ?? "Không lưu được", { kind: "error" });
    else { show("Đã cập nhật", { kind: "success", duration: 1500 }); router.refresh(); }
  };

  const quickFields = section.fields.filter((f) => f.type === "select" || f.type === "boolean");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap anim-in">
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Icon name="search" size={20} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--md-on-surface-variant)" }} />
          <input className="m3-input m3-input-outlined" placeholder={`Tìm trong ${section.label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 46 }} />
        </div>
        <span className="body-sm text-on-surface-variant">{filtered.length}/{rows.length}</span>
        {createFields.length > 0 && (
          <button className="m3-btn m3-btn-filled" onClick={() => open("new")}><Icon name="add" /><span>Thêm</span></button>
        )}
      </div>

      <div className="admin-table-wrap m3-card-outlined anim-in delay-1">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key}>{c.label}</th>)}
              {quickFields.map((f) => <th key={f.key}>{f.label}</th>)}
              <th style={{ textAlign: "right" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => (
                  <td key={c.key} className={`${c.mono ? "mono" : ""} ${c.clamp ? "clamp" : ""}`} title={c.clamp ? String(r[c.key] ?? "") : undefined}>
                    {String(r[c.key] ?? "")}
                  </td>
                ))}
                {quickFields.map((f) => (
                  <td key={f.key}>
                    {f.type === "boolean" ? (
                      <button className={`m3-chip sm round ${r[f.key] ? "m3-chip-primary" : "m3-chip-error"}`} onClick={() => quick(r, f.key, !r[f.key])} aria-pressed={!!r[f.key]}>
                        <Icon name={r[f.key] ? "check_circle" : "cancel"} size={16} filled /> {r[f.key] ? "Có" : "Không"}
                      </button>
                    ) : (
                      <select className={`admin-select tone-${String(r[f.key] ?? "")}`} value={String(r[f.key] ?? "")} onChange={(e) => quick(r, f.key, e.target.value)} aria-label={f.label}>
                        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    )}
                  </td>
                ))}
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {section.fields.length > 0 && <button className="m3-icon-btn sm" onClick={() => open(r)} aria-label="Sửa" title="Sửa"><Icon name="edit" size={20} /></button>}
                  {section.canDelete && <button className="m3-icon-btn sm" onClick={() => setConfirm(r)} aria-label="Xoá" title="Xoá" style={{ color: "var(--md-error)" }}><Icon name="delete" size={20} /></button>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={columns.length + quickFields.length + 1} className="body-md text-on-surface-variant" style={{ textAlign: "center", padding: 32 }}>Không có mục nào.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Portal>
          <div className="m3-scrim" onClick={() => setEditing(null)} aria-hidden />
          <form className="m3-dialog" onSubmit={save} role="dialog" aria-modal="true">
            <h2 className="headline-sm" style={{ marginBottom: 18 }}>{editing === "new" ? `Thêm ${section.label.toLowerCase()}` : `Sửa ${section.label.toLowerCase()}`}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {(editing === "new" ? createFields : section.fields).map((f) => {
                const v = form[f.key];
                const opts = lookups?.[f.key];
                return (
                  <div key={f.key} className="m3-field">
                    <label className="m3-field-label" htmlFor={`f-${f.key}`}>{f.label}{f.required ? " *" : ""}</label>
                    {f.type === "boolean" ? (
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <input id={`f-${f.key}`} type="checkbox" checked={!!v} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} style={{ width: 20, height: 20, accentColor: "var(--md-primary)" }} />
                        <span className="body-md">{v ? "Có" : "Không"}</span>
                      </label>
                    ) : f.type === "select" || opts ? (
                      <select id={`f-${f.key}`} className="m3-select" value={String(v ?? "")} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.required}>
                        <option value="">— chọn —</option>
                        {(f.options ?? opts ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : f.type === "textarea" || f.type === "list" ? (
                      <textarea id={`f-${f.key}`} className="m3-textarea" rows={f.type === "list" ? 5 : 4} value={String(v ?? "")} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.required} />
                    ) : (
                      <input id={`f-${f.key}`} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} min={f.min} className="m3-input" value={String(v ?? "")} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.required} />
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
              <button type="button" className="m3-btn m3-btn-text" onClick={() => setEditing(null)}>Huỷ</button>
              <button type="submit" className="m3-btn m3-btn-filled" disabled={busy}>{busy ? <span className="m3-loader sm on-primary" /> : <Icon name="save" />}<span>Lưu</span></button>
            </div>
          </form>
        </Portal>
      )}

      {confirm && (
        <Portal>
          <div className="m3-scrim" onClick={() => setConfirm(null)} aria-hidden />
          <div className="m3-dialog" role="alertdialog" aria-modal="true" style={{ width: "min(420px, calc(100vw - 32px))" }}>
            <span className="m3-list-leading" style={{ background: "var(--md-error-container)", color: "var(--md-on-error-container)", marginBottom: 12 }}><Icon name="delete_forever" filled /></span>
            <h2 className="headline-sm" style={{ marginBottom: 6 }}>Xoá mục này?</h2>
            <p className="body-md text-on-surface-variant">Thao tác không hoàn tác được. Dữ liệu phụ thuộc (món trong đơn, thành viên nhóm…) cũng bị xoá theo.</p>
            <p className="body-sm" style={{ marginTop: 8, fontFamily: "monospace" }}>{confirm.id}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
              <button className="m3-btn m3-btn-text" onClick={() => setConfirm(null)}>Giữ lại</button>
              <button className="m3-btn m3-btn-error" onClick={remove} disabled={busy}>{busy ? <span className="m3-loader sm" /> : <Icon name="delete" />}<span>Xoá</span></button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
