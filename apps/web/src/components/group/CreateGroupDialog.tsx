"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";
import { Portal } from "@/components/ui/Portal";
import { useSnackbar } from "@/components/ui/Snackbar";
import { formatVND } from "@/lib/format";
import { deliveryDates, formatYMD } from "@/lib/commerce";

interface Opt { id: string; name: string }

export function CreateGroupDialog({ boxes, clusters, myClusterId, earliest }: { boxes: (Opt & { price: number; size: string })[]; clusters: (Opt & { district: string })[]; myClusterId: string | null; earliest: string }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const { show } = useSnackbar();
  const [form, setForm] = useState({ box_id: boxes[1]?.id ?? boxes[0]?.id ?? "", cluster_id: myClusterId ?? clusters[0]?.id ?? "", title: "", min_members: 3, delivery_date: earliest, quantity: 1 });
  const close = () => { setClosing(true); setTimeout(() => { setClosing(false); setOpen(false); }, 250); };
  // Only delivery days (Wednesday, Sunday) within two weeks of the earliest open one.
  const dates = deliveryDates(earliest, 14);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const cluster = clusters.find((c) => c.id === form.cluster_id);
      const res = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, title: form.title.trim() || `Gom hộp rau ${cluster?.name ?? ""}` }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không tạo được nhóm");
      show("Đã tạo nhóm. Chia sẻ link cho bạn cùng khu nhé!", { kind: "success" });
      close();
      router.push(`/gom-don/${data.id}`);
      router.refresh();
    } catch (err) { show(err instanceof Error ? err.message : "Có lỗi", { kind: "error" }); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button className="m3-btn m3-btn-filled" onClick={() => (session ? setOpen(true) : router.push("/dang-nhap?role=customer&next=/gom-don"))}><Icon name="add" /><span>Tạo nhóm mới</span></button>
      {open && (
        <Portal>
          <div className={`m3-scrim ${closing ? "closing" : ""}`} onClick={close} aria-hidden />
          <form className={`m3-dialog ${closing ? "closing" : ""}`} onSubmit={submit} role="dialog" aria-modal="true">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <span className="m3-list-leading"><Icon name="groups" filled /></span>
              <div><h2 className="headline-sm">Tạo nhóm gom đơn</h2><p className="body-sm text-on-surface-variant">Cùng điểm nhận, cùng một chuyến xe, đủ nhóm là miễn phí giao</p></div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="m3-field"><label className="m3-field-label" htmlFor="cg-cluster">Điểm nhận (ký túc xá / khu trọ)</label>
                <select id="cg-cluster" className="m3-select" value={form.cluster_id} onChange={(e) => setForm({ ...form, cluster_id: e.target.value })} required>{clusters.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.district}</option>)}</select></div>
              <div className="m3-field"><label className="m3-field-label" htmlFor="cg-box">Hộp rau</label>
                <select id="cg-box" className="m3-select" value={form.box_id} onChange={(e) => setForm({ ...form, box_id: e.target.value })} required>{boxes.map((b) => <option key={b.id} value={b.id}>{b.name} · {formatVND(b.price)}</option>)}</select></div>
              <div className="m3-field"><label className="m3-field-label" htmlFor="cg-title">Tên nhóm</label>
                <input id="cg-title" className="m3-input" placeholder="Ví dụ: Hội nấu cơm nhà B6" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="m3-field"><label className="m3-field-label" htmlFor="cg-min">Số người tối thiểu</label><input id="cg-min" type="number" min={2} max={50} className="m3-input" value={form.min_members} onChange={(e) => setForm({ ...form, min_members: Number(e.target.value) })} required /></div>
                <div className="m3-field"><label className="m3-field-label" htmlFor="cg-date">Ngày giao</label>
                  <select id="cg-date" className="m3-select" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}>{dates.map((d) => <option key={d} value={d}>{formatYMD(d, { weekday: "short", day: "numeric", month: "numeric" })}</option>)}</select></div>
                <div className="m3-field"><label className="m3-field-label" htmlFor="cg-qty">Bạn đặt</label><input id="cg-qty" type="number" min={1} max={20} className="m3-input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required /></div>
              </div>
            </div>
            <p className="body-sm text-on-surface-variant" style={{ marginTop: 10 }}>Chọn ngày giao thứ Tư hoặc Chủ nhật trong 2 tuần tới. Giờ giao luôn là 16h00 tại điểm nhận, chốt sổ 18h00 hôm trước. Chưa đủ nhóm thì mỗi hộp trả phí giao theo size.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
              <button type="button" className="m3-btn m3-btn-text" onClick={close}>Huỷ</button>
              <button type="submit" className="m3-btn m3-btn-filled" disabled={busy}>{busy ? <span className="m3-loader sm on-primary" /> : <Icon name="rocket_launch" />}<span>Tạo nhóm</span></button>
            </div>
          </form>
        </Portal>
      )}
    </>
  );
}
