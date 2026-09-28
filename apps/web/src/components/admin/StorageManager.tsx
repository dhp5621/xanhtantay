"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { useSnackbar } from "@/components/ui/Snackbar";

interface Item { key: string; label: string; what: string; count: number; bytes: number | null; examples: string[]; available: boolean }
interface Data {
  database: { bytes: number; limit: number; tables: { name: string; bytes: number; rows: number }[] };
  files: { configured: boolean; count: number; bytes: number; limit: number };
  items: Item[];
  removed?: { key: string; removed: number; bytes: number }[];
}
const size = (b: number) => (b >= 1024 ** 2 ? `${(b / 1024 ** 2).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB` : `${Math.max(0, Math.round(b / 1024)).toLocaleString("vi-VN")} KB`);
const TABLES: Record<string, string> = { orders: "Đơn hàng", users: "Người dùng", boxes: "Hộp rau", box_items: "Thành phần hộp", produce: "Loại rau củ", farms: "Nông hộ", farm_capacity: "Năng suất", harvest_runs: "Chuyến giao", harvest_commands: "Lệnh thu hoạch", subscriptions: "Gói định kỳ", group_orders: "Nhóm gom đơn", clusters: "Cụm chung cư", push_devices: "Thiết bị nhận thông báo", broadcasts: "Thông báo quản trị", change_requests: "Yêu cầu của nông hộ", refund_requests: "Yêu cầu hoàn tiền" };
const KEPT = ["Đơn hàng đã giao, đã huỷ", "Chuyến giao và lệnh thu hoạch", "Kết quả xử lý hoàn tiền (lý do, số tiền)", "Gói định kỳ, nhóm gom đơn", "Tài khoản, vườn, hộp rau"];

function Meter({ icon, title, used, limit, note }: { icon: string; title: string; used: number; limit: number; note: string }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <section className="m3-card-filled" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}>
      <p className="title-md text-on-surface" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name={icon} filled className="text-primary" /> {title}</p>
      <p className="headline-md text-on-surface tabular" style={{ marginTop: 8 }}>{size(used)} <span className="body-md text-on-surface-variant">/ {size(limit)} · {pct.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%</span></p>
      <div className="m3-bar" style={{ marginTop: 10 }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={title}><span className={pct > 90 ? "over" : pct > 70 ? "warn" : ""} style={{ width: `${pct}%` }} /></div>
      <p className="body-sm text-on-surface-variant" style={{ marginTop: 8 }}>{note}</p>
    </section>
  );
}

/** Database and file store usage, and a careful clean-up of data nothing shows any more. */
export function StorageManager() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const { show } = useSnackbar();

  const load = async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/storage", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Lỗi ${res.status}`);
      setData(json);
      setChosen((json as Data).items.filter((i) => i.available && i.count > 0).map((i) => i.key));
    } catch (e) { setError(e instanceof Error ? e.message : "Có lỗi"); }
  };
  useEffect(() => { void load(); }, []);

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/storage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keys: chosen, confirm: "XOA" }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Không xoá được");
      setData(json);
      const total = (json as Data).removed?.reduce((s, r) => s + r.removed, 0) ?? 0;
      const freed = (json as Data).removed?.reduce((s, r) => s + r.bytes, 0) ?? 0;
      show(`Đã xoá ${total} mục${freed ? `, giải phóng ${size(freed)}` : ""}`, { kind: "success", duration: 7000 });
      setChosen([]);
      setConfirm(false);
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error", duration: 7000 }); }
    finally { setBusy(false); setUnderstood(false); }
  };

  if (error) return <div className="m3-request rejected" role="alert"><Icon name="error" filled /><div><p className="title-md">Không đọc được dung lượng</p><p className="body-sm">{error}</p><button type="button" className="m3-btn m3-btn-text m3-btn-sm" style={{ marginLeft: -12 }} onClick={load}>Thử lại</button></div></div>;
  if (!data) return <div style={{ display: "grid", placeItems: "center", minHeight: 200 }}><span className="m3-loader" /></div>;

  const picked = data.items.filter((i) => chosen.includes(i.key) && i.count > 0);
  const nothing = data.items.every((i) => i.count === 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Meter icon="database" title="Cơ sở dữ liệu" used={data.database.bytes} limit={data.database.limit} note="Đơn hàng, tài khoản, lệnh thu hoạch, ảnh đại diện và ảnh rau củ mới." />
        {data.files.configured
          ? <Meter icon="cloud" title="Kho tệp (ảnh, video)" used={data.files.bytes} limit={data.files.limit} note={`${data.files.count} tệp · ảnh và video bằng chứng khi trả hàng / hoàn tiền.`} />
          : <section className="m3-card-filled" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}><p className="title-md text-on-surface" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="cloud_off" filled /> Kho tệp (ảnh, video)</p><p className="body-md text-on-surface-variant" style={{ marginTop: 8 }}>Máy chủ chưa cấu hình kho tệp (BLOB_READ_WRITE_TOKEN), nên chưa nhận được ảnh và video bằng chứng.</p></section>}
      </div>

      <section>
        <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="cleaning_services" filled /> Dọn dữ liệu không còn cần</h2><span className="body-sm text-on-surface-variant">Tự dọn mỗi ngày lúc 18h00 · có thể dọn ngay tại đây</span></div>
        <div className="m3-list-group">
          {data.items.map((i) => {
            const on = chosen.includes(i.key);
            const can = i.available && i.count > 0;
            return (
              <label key={i.key} className="m3-list-item" style={{ alignItems: "flex-start", cursor: can ? "pointer" : "default", opacity: can ? 1 : 0.7 }}>
                <input type="checkbox" checked={on && can} disabled={!can} onChange={(e) => setChosen((c) => (e.target.checked ? [...c, i.key] : c.filter((k) => k !== i.key)))} style={{ width: 20, height: 20, marginTop: 4, accentColor: "var(--md-primary)", flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="title-md" style={{ display: "block" }}>{i.label}</span>
                  <span className="body-sm text-on-surface-variant" style={{ display: "block", fontWeight: 400 }}>{i.what}</span>
                  {i.examples.length > 0 && <span className="body-sm text-on-surface-variant" style={{ display: "block", fontWeight: 400, marginTop: 4, overflowWrap: "anywhere" }}>Ví dụ: {i.examples.join(" · ")}{i.count > i.examples.length ? ` · và ${i.count - i.examples.length} mục khác` : ""}</span>}
                  {!i.available && <span className="body-sm" style={{ display: "block", color: "var(--md-error)" }}>Cần cấu hình kho tệp mới dọn được.</span>}
                </span>
                <span className="label-lg tabular" style={{ textAlign: "right", flexShrink: 0 }}>{i.count ? `${i.count} mục` : "Không có"}{i.bytes ? <><br /><span className="body-sm text-on-surface-variant">{size(i.bytes)}</span></> : null}</span>
              </label>
            );
          })}
        </div>
        <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 14 }}>
          <button type="button" className="m3-btn m3-btn-filled" style={{ background: "var(--md-error)", color: "var(--md-on-error)" }} disabled={!picked.length} onClick={() => setConfirm(true)}><Icon name="delete_forever" size={18} /><span>Xoá các mục đã chọn</span></button>
          <button type="button" className="m3-btn m3-btn-text" onClick={load}><Icon name="refresh" size={18} /><span>Tính lại</span></button>
          {nothing && <span className="body-sm text-on-surface-variant">Hiện không có gì cần dọn.</span>}
        </div>
      </section>

      <section className="m3-card-filled" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}>
        <p className="title-md text-on-surface" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="shield" filled className="text-primary" /> Luôn được giữ lại</p>
        <p className="body-sm text-on-surface-variant" style={{ margin: "6px 0 10px" }}>Dữ liệu cũ nhưng vẫn cần xem lại thì không bao giờ bị dọn, kể cả khi đã xử lý xong từ lâu:</p>
        <div className="flex flex-wrap gap-2">{KEPT.map((k) => <span key={k} className="m3-chip sm round m3-chip-surface"><Icon name="lock" size={14} /> {k}</span>)}</div>
      </section>

      <section>
        <h2 className="title-lg text-on-surface" style={{ marginBottom: 12 }}>Dung lượng từng bảng</h2>
        <div className="m3-list-group">
          {data.database.tables.map((t) => (
            <div key={t.name} className="m3-list-item" style={{ cursor: "default" }}>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block" }}>{TABLES[t.name] ?? t.name}</span><span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{t.name} · {t.rows.toLocaleString("vi-VN")} dòng</span></span>
              <span className="label-lg tabular">{size(t.bytes)}</span>
            </div>
          ))}
        </div>
      </section>

      {confirm && (
        <Portal>
          <div className="m3-scrim" onClick={() => !busy && setConfirm(false)} aria-hidden />
          <div className="m3-dialog" role="alertdialog" aria-modal="true" aria-labelledby="sm-title" style={{ width: "min(520px, calc(100vw - 32px))" }}>
            <span className="m3-list-leading" style={{ marginBottom: 12, background: "var(--md-error-container)", color: "var(--md-on-error-container)" }}><Icon name="warning" filled /></span>
            <h2 id="sm-title" className="headline-sm" style={{ marginBottom: 6 }}>Xoá vĩnh viễn các mục này?</h2>
            <p className="body-md text-on-surface-variant">Dữ liệu đã xoá <strong className="text-on-surface">không khôi phục được</strong>. Xin xem kỹ danh sách trước khi xoá:</p>
            <ul style={{ margin: "12px 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {picked.map((i) => <li key={i.key} className="body-md"><strong>{i.count} mục</strong>{i.bytes ? ` (${size(i.bytes)})` : ""}: {i.label}.<br /><span className="body-sm text-on-surface-variant">{i.what}</span></li>)}
            </ul>
            <p className="body-sm text-on-surface-variant">Đơn hàng, chuyến giao, lệnh thu hoạch và kết quả hoàn tiền không bị ảnh hưởng.</p>
            <label className="body-md" style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2, accentColor: "var(--md-error)", flexShrink: 0 }} />
              <span>Tôi đã xem danh sách và hiểu rằng không khôi phục được.</span>
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
              <button type="button" className="m3-btn m3-btn-text" onClick={() => setConfirm(false)} disabled={busy}>Không xoá</button>
              <button type="button" className="m3-btn m3-btn-filled" style={{ background: "var(--md-error)", color: "var(--md-on-error)" }} onClick={remove} disabled={busy || !understood}>{busy ? <span className="m3-loader sm on-primary" /> : <Icon name="delete_forever" size={18} />}<span>Xoá vĩnh viễn</span></button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
