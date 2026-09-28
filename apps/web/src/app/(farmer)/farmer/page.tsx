export const dynamic = "force-dynamic";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getCommandsForFarmer } from "@/lib/queries";
import { Icon } from "@/components/ui/Icon";
import { HarvestCommand } from "@/components/farmer/HarvestCommand";
import { addressFarmer, formatKg, formatYMD, todayVN } from "@/lib/commerce";
import { RUN_STATUS_LABELS } from "@/lib/format";

export const metadata = { title: "Lệnh thu hoạch" };

/** The entire farmer interface: today's command in big type, one button, and a plain history. */
export default async function FarmerPage() {
  const user = (await getSessionUser())!; // the layout guarantees a farmer session
  const { farm, commands } = await getCommandsForFarmer(user.id);
  const today = todayVN();
  // The command that needs attention: unconfirmed first, else the upcoming / today's one.
  const current = commands.find((c) => c.status === "sent") ?? commands.find((c) => c.delivery_date >= today && c.run_status !== "delivered") ?? null;
  const history = commands.filter((c) => c.id !== current?.id);
  const call = addressFarmer(user.name ?? "Bác").call;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="anim-in">
        <p className="m3-eyebrow">{farm ? `${farm.name} · ${farm.location}` : "Chưa gắn với vườn"}</p>
        <h1 className="headline-lg text-on-surface">Chào {call.replace(/^./, (c) => c.toLowerCase())}!</h1>
      </div>

      {current ? (
        <HarvestCommand
          command={{ id: current.id, message: current.message, items: current.items.map((i) => ({ name: i.name, kg: i.kg })), total_kg: current.total_kg, status: current.status, confirmed_at: current.confirmed_at, declined_at: current.declined_at, delivery_date: current.delivery_date }}
          dateLabel={formatYMD(current.delivery_date)}
        />
      ) : (
        <section className="m3-command confirmed anim-in-scale" style={{ textAlign: "center" }}>
          <Icon name="bedtime" size={56} filled className="text-primary" />
          <p className="m3-command-text" style={{ marginTop: 12 }}>Chưa có lệnh thu hoạch.</p>
          <p className="body-lg text-on-surface-variant" style={{ marginTop: 8 }}>18h00 mỗi ngày hệ thống sẽ gửi lệnh cho sáng hôm sau.</p>
        </section>
      )}

      <nav className="m3-list-group anim-in delay-1" aria-label="Vườn của tôi">
        <Link href="/farmer/nang-suat" className="m3-list-item"><span className="m3-list-leading"><Icon name="scale" filled /></span><span style={{ flex: 1 }}><span style={{ display: "block" }}>Rau củ đăng ký</span><span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>Mỗi ngày cắt được bao nhiêu ký mỗi loại</span></span><Icon name="chevron_right" /></Link>
        <Link href="/farmer/vuon" className="m3-list-item"><span className="m3-list-leading"><Icon name="storefront" filled /></span><span style={{ flex: 1 }}><span style={{ display: "block" }}>Thông tin vườn</span><span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>Tên, địa chỉ, lời giới thiệu</span></span><Icon name="chevron_right" /></Link>
      </nav>

      {history.length > 0 && (
        <section className="anim-in delay-2">
          <h2 className="title-lg text-on-surface" style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="history" filled /> Những lần trước</h2>
          <div className="m3-list-group">
            {history.map((c) => (
              <div key={c.id} className="m3-list-item" style={{ cursor: "default", flexWrap: "wrap" }}>
                <span className="m3-list-leading"><Icon name={c.status === "confirmed" ? "check_circle" : c.status === "declined" ? "cancel" : "schedule"} filled /></span>
                <span style={{ flex: 1, minWidth: 160 }}>
                  <span style={{ display: "block" }}>{formatYMD(c.delivery_date)}</span>
                  <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{c.items.map((i) => `${formatKg(i.kg)} ${i.name.toLowerCase()}`).join(" · ")}</span>
                </span>
                <span className="label-lg tabular">{formatKg(c.total_kg)}</span>
                <span className={`status-pill status-${c.run_status}`}>{RUN_STATUS_LABELS[c.run_status]}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
