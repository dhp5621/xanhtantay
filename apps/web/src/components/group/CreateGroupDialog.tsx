"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";

interface FarmOpt { id: string; name: string }

export function CreateGroupDialog({ farms }: { farms: FarmOpt[] }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const { show } = useSnackbar();

  const defaultDeadline = () => {
    const d = new Date(); d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  };

  const [form, setForm] = useState({ farm_id: farms[0]?.id ?? "", title: "", min_members: 5, deadline: defaultDeadline(), shipping_address: "" });

  const close = () => { setClosing(true); setTimeout(() => { setClosing(false); setOpen(false); }, 250); };
  const openDialog = () => {
    if (!session) { router.push("/dang-nhap?next=/gom-don"); return; }
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, min_members: Number(form.min_members) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không tạo được nhóm");
      show("Đã tạo nhóm gom đơn. Chia sẻ link để mời hàng xóm!", { kind: "success" });
      close();
      router.push(`/gom-don/${data.id}`);
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Có lỗi xảy ra", { kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="m3-btn m3-btn-filled" onClick={openDialog}>
        <Icon name="add" /><span>Tạo nhóm mới</span>
      </button>

      {open && (
        <>
          <div className={`m3-scrim ${closing ? "closing" : ""}`} onClick={close} aria-hidden />
          <form className={`m3-dialog ${closing ? "closing" : ""}`} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="cg-title">
            <div className="m3-dialog-icon"><Icon name="groups" size={24} filled /></div>
            <div className="m3-dialog-header">
              <h2 className="m3-dialog-title" id="cg-title">Tạo nhóm gom đơn</h2>
              <p className="m3-dialog-desc">Đủ người là cả nhóm được freeship</p>
            </div>

            <div className="m3-dialog-body">
              <div className="m3-field">
                <label className="m3-field-label" htmlFor="cg-farm">Vườn rau</label>
                <select id="cg-farm" className="m3-select" value={form.farm_id} onChange={(e) => setForm({ ...form, farm_id: e.target.value })} required>
                  {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="m3-field">
                <label className="m3-field-label" htmlFor="cg-title-input">Tên nhóm</label>
                <input id="cg-title-input" className="m3-input" placeholder="Ví dụ: Rau sạch chung cư Sunrise" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={80} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="m3-field">
                  <label className="m3-field-label" htmlFor="cg-min">Số người tối thiểu</label>
                  <input id="cg-min" type="number" min={2} max={50} className="m3-input" value={form.min_members} onChange={(e) => setForm({ ...form, min_members: Number(e.target.value) })} required />
                </div>
                <div className="m3-field">
                  <label className="m3-field-label" htmlFor="cg-deadline">Hạn chốt</label>
                  <input id="cg-deadline" type="date" className="m3-input" value={form.deadline} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
                </div>
              </div>
              <div className="m3-field">
                <label className="m3-field-label" htmlFor="cg-addr">Địa chỉ nhận chung</label>
                <input id="cg-addr" className="m3-input" placeholder="Sảnh chung cư, số nhà, phường…" value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} required maxLength={160} />
              </div>
            </div>

            <div className="m3-dialog-actions">
              <button type="button" className="m3-btn m3-btn-text" onClick={close}>Huỷ</button>
              <button type="submit" className="m3-btn m3-btn-filled" disabled={loading || !farms.length}>
                {loading ? <span className="m3-loader sm on-primary" /> : <Icon name="rocket_launch" />}
                <span>Tạo nhóm</span>
              </button>
            </div>
          </form>
        </>
      )}
    </>
  );
}
