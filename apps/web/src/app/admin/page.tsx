export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/db";
import { users, farms, orders, subscriptions, group_orders, push_devices, harvest_runs, harvest_commands, farm_capacity, produce, change_requests, type FarmChange, type CapacityChange } from "@/db/schema";
import { and, count, desc, eq, ne, sum } from "drizzle-orm";
import { Icon } from "@/components/ui/Icon";
import { AdminPush } from "@/components/admin/AdminPush";
import { RequestReview } from "@/components/admin/RequestReview";
import { FARM_FIELD_LABELS } from "@/lib/requests";
import { CutoffBanner } from "@/components/ui/CutoffBanner";
import { CutoffButton, AdvanceRunButton } from "@/components/admin/BrainControls";
import { formatVND, RUN_STATUS_LABELS, formatClock } from "@/lib/format";
import { previewFor, forecast } from "@/lib/brain";
import { addressFarmer, cutoffInstant, FARMER_SHARE, formatKg, formatYMD, isPastCutoff, nextDeliveryDate, todayVN, addDays } from "@/lib/commerce";

export const metadata = { title: { absolute: "Bộ não · Quản trị Xanh Tận Tay" } };

export default async function BrainDashboard() {
  const today = todayVN();
  const bookDate = nextDeliveryDate();                 // the book customers are ordering into right now
  // If tomorrow's book is past its cut-off but was never closed, that one needs closing first.
  const tomorrow = addDays(today, 1);

  const requests = await db.select({ r: change_requests, farm: farms, farmer: users.name }).from(change_requests).innerJoin(farms, eq(change_requests.farm_id, farms.id)).leftJoin(users, eq(farms.owner_id, users.id)).where(eq(change_requests.status, "pending")).orderBy(desc(change_requests.created_at));
  const [preview, fc, runs, caps, [u], [f], [rev], [s], [g], pushRows, [openTomorrow]] = await Promise.all([
    previewFor(bookDate),
    forecast(addDays(today, 1), 7),
    db.select().from(harvest_runs).orderBy(desc(harvest_runs.delivery_date)).limit(6),
    db.select({ produce_id: farm_capacity.produce_id, name: produce.name, s: sum(farm_capacity.daily_kg) }).from(farm_capacity).innerJoin(produce, eq(farm_capacity.produce_id, produce.id)).groupBy(farm_capacity.produce_id, produce.name),
    db.select({ c: count() }).from(users).where(eq(users.role, "customer")),
    db.select({ c: count() }).from(farms),
    db.select({ s: sum(orders.total) }).from(orders).where(eq(orders.status, "delivered")),
    db.select({ c: count() }).from(subscriptions).where(eq(subscriptions.active, true)),
    db.select({ c: count() }).from(group_orders).where(eq(group_orders.status, "open")),
    db.select({ platform: push_devices.platform, c: count() }).from(push_devices).groupBy(push_devices.platform),
    db.select({ c: count() }).from(orders).where(and(eq(orders.delivery_date, tomorrow), eq(orders.status, "placed"), ne(orders.type, "subscription"))),
  ]);
  const commands = runs.length ? await db.select({ c: harvest_commands, farm: farms.name, farmer: users.name }).from(harvest_commands).innerJoin(farms, eq(harvest_commands.farm_id, farms.id)).leftJoin(users, eq(farms.owner_id, users.id)).orderBy(desc(harvest_commands.total_kg)) : [];
  const pushCounts = { mobile: pushRows.filter((r) => r.platform !== "web").reduce((n, r) => n + r.c, 0), web: pushRows.find((r) => r.platform === "web")?.c ?? 0 };
  const revenue = Number(rev.s ?? 0);
  const capOf = new Map(caps.map((c) => [c.produce_id, Number(c.s ?? 0)]));
  const totalCapacity = caps.reduce((n, c) => n + Number(c.s ?? 0), 0);
  const bookRun = runs.find((r) => r.delivery_date === bookDate);
  const lateBook = bookDate !== tomorrow && openTomorrow.c > 0 && !runs.some((r) => r.delivery_date === tomorrow) && isPastCutoff(tomorrow);
  const maxFc = Math.max(1, ...fc.days.map((d) => d.kg));

  const tiles = [
    { icon: "inventory_2", label: `Hộp trong sổ (giao ${formatYMD(bookDate, { day: "numeric", month: "numeric" })})`, value: preview.boxes, tone: "primary" },
    { icon: "scale", label: "Cần thu hoạch", value: formatKg(preview.total_kg), tone: "tertiary" },
    { icon: "recycling", label: "Rau thừa dự kiến", value: "0%", tone: "secondary" },
    { icon: "warning", label: "Thiếu so với năng suất", value: formatKg(preview.shortage_kg), tone: preview.shortage_kg > 0 ? "error" : "surface" },
    { icon: "payments", label: "GMV đã giao", value: formatVND(revenue), tone: "surface" },
    { icon: "agriculture", label: "Về tay nông hộ", value: formatVND(Math.round(revenue * FARMER_SHARE)), tone: "surface" },
    { icon: "event_repeat", label: "Gói định kỳ đang chạy", value: s.c, tone: "surface" },
    { icon: "groups", label: "Nhóm gom đơn mở", value: g.c, tone: "surface" },
  ];
  const toneStyle = (t: string) => t === "surface" ? { background: "var(--md-surface-container-high)", color: "var(--md-on-surface)" } : { background: `var(--md-${t}-container)`, color: `var(--md-on-${t}-container)` };

  return (
    <div className="flex flex-col gap-8">
      <div className="anim-in flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="m3-eyebrow" style={{ color: "var(--md-tertiary)" }}>Bộ não trung tâm</p>
          <h1 className="headline-lg text-on-surface">Gom nhu cầu, chia lệnh thu hoạch</h1>
          <p className="body-md text-on-surface-variant">{u.c} khách · {f.c} nông hộ · tổng năng suất {formatKg(totalCapacity)}/ngày</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {lateBook && <CutoffButton date={tomorrow} label={formatYMD(tomorrow)} />}
          {!lateBook && (bookRun ? <CutoffButton date={bookDate} label={formatYMD(bookDate)} reallocate disabled={bookRun.status !== "allocated"} /> : <CutoffButton date={bookDate} label={formatYMD(bookDate)} disabled={preview.boxes === 0} />)}
        </div>
      </div>

      {lateBook && <p className="status-pill status-cancelled" style={{ height: "auto", padding: "10px 14px", whiteSpace: "normal" }}><Icon name="warning" size={18} filled /> Sổ giao {formatYMD(tomorrow)} đã qua 18h00 mà chưa chốt ({openTomorrow.c} đơn). Bấm “Chốt sổ & gửi lệnh”.</p>}
      {requests.length > 0 && <a href="#duyet" className="m3-request pending" style={{ textDecoration: "none" }}><Icon name="fact_check" filled /><span style={{ flex: 1 }}><span className="title-md" style={{ display: "block" }}>{requests.length} yêu cầu của nông hộ đang chờ duyệt</span><span className="body-sm" style={{ opacity: 0.85 }}>Đổi thông tin vườn hoặc rau củ đăng ký chỉ có hiệu lực sau khi duyệt.</span></span><Icon name="arrow_downward" /></a>}
      <CutoffBanner cutoffAt={cutoffInstant(bookDate).toISOString()} deliveryLabel={formatYMD(bookDate)} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
        {tiles.map((t) => (
          <div key={t.label} className="lift" style={{ ...toneStyle(t.tone), borderRadius: "var(--shape-xl)", padding: "18px 20px" }}>
            <Icon name={t.icon} size={26} filled />
            <p className="headline-md tabular" style={{ marginTop: 6, lineHeight: 1.1 }}>{t.value}</p>
            <p className="body-sm" style={{ marginTop: 6, opacity: 0.8 }}>{t.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand vs capacity */}
        <section className="m3-card-filled" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}>
          <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="monitoring" filled /> Nhu cầu / năng suất</h2><span className="body-sm text-on-surface-variant">{preview.orders} đơn + {preview.subscriptions_due} gói định kỳ</span></div>
          {preview.lines.length === 0 ? <p className="body-md text-on-surface-variant">Sổ đang trống. Khi khách đặt hộp, nhu cầu từng loại rau sẽ hiện ở đây.</p> : (
            <div className="flex flex-col gap-3">
              {preview.lines.map((l) => {
                const cap = capOf.get(l.produce_id) ?? l.capacity_kg;
                const pct = cap ? Math.min(100, Math.round((l.kg / cap) * 100)) : 100;
                return (
                  <div key={l.produce_id} className="m3-bar-row">
                    <span className="title-sm text-on-surface">{l.name}</span>
                    <div className="m3-bar" title={`${pct}% năng suất`}><span className={l.shortage_kg > 0 ? "over" : pct >= 80 ? "warn" : ""} style={{ width: `${pct}%` }} /></div>
                    <span className="body-sm tabular text-on-surface-variant" style={{ minWidth: 110, textAlign: "right" }}>{formatKg(l.kg)} / {formatKg(cap)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Allocation preview */}
        <section className="m3-card-filled" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}>
          <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="call_split" filled /> {bookRun ? "Lệnh đã gửi" : "Nếu chốt sổ bây giờ"}</h2><span className="body-sm text-on-surface-variant">Chia theo năng suất, bước 0,5 kg</span></div>
          {preview.allocations.length === 0 && !bookRun ? <p className="body-md text-on-surface-variant">Chưa có gì để phân bổ.</p> : (
            <div className="m3-list-group">
              {(bookRun ? commands.filter((c) => c.c.run_id === bookRun.id).map((c) => ({ farm_id: c.c.farm_id, farm_name: c.farm, farmer_name: c.farmer ?? c.farm, items: c.c.items, total_kg: Number(c.c.total_kg), confirmed: c.c.status === "confirmed", declined: c.c.status === "declined" })) : preview.allocations.map((a) => ({ ...a, confirmed: null as boolean | null, declined: false }))).map((a) => (
                <div key={a.farm_id} className="m3-list-item" style={{ cursor: "default", alignItems: "flex-start", background: "var(--md-surface-container-lowest)" }}>
                  <span className="m3-list-leading"><Icon name="agriculture" filled /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block" }}>{addressFarmer(a.farmer_name).call} · {a.farm_name}</span>
                    <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{a.items.map((i) => `${formatKg(i.kg)} ${i.name.toLowerCase()}`).join(" · ")}</span>
                  </span>
                  <span className="label-lg tabular">{formatKg(a.total_kg)}</span>
                  {a.confirmed !== null && <span className={`m3-chip sm round ${a.confirmed ? "m3-chip-primary" : a.declined ? "m3-chip-error" : "m3-chip-surface"}`}><Icon name={a.confirmed ? "check_circle" : a.declined ? "cancel" : "schedule"} size={14} filled /> {a.confirmed ? "Đã xác nhận" : a.declined ? "Không cắt được" : "Chờ"}</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Forecast */}
      <section className="m3-card-filled" style={{ padding: 22, borderRadius: "var(--shape-xl)" }}>
        <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="insights" filled /> Dự báo 7 ngày tới</h2><span className="body-sm text-on-surface-variant">Từ gói định kỳ và đơn đã đặt trước</span></div>
        <div className="grid grid-cols-7 gap-2" style={{ alignItems: "end", height: 170 }}>
          {fc.days.map((d) => (
            <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
              <span className="label-sm tabular text-on-surface">{d.kg ? formatKg(d.kg) : ""}</span>
              <div style={{ width: "100%", maxWidth: 56, height: `${Math.max(4, (d.kg / maxFc) * 100)}%`, borderRadius: "var(--shape-md) var(--shape-md) 4px 4px", background: d.date === bookDate ? "var(--md-primary)" : "var(--md-primary-container)", transition: "height .5s" }} title={`${d.boxes} hộp`} />
              <span className="body-sm text-on-surface-variant" style={{ fontSize: 11, textAlign: "center" }}>{formatYMD(d.date, { weekday: "short", day: "numeric", month: "numeric" })}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Runs */}
      <section>
        <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="route" filled /> Các chuyến</h2><Link href="/admin/harvest_commands" className="m3-btn m3-btn-text m3-btn-sm"><span>Mọi lệnh thu hoạch</span><Icon name="arrow_forward" size={18} /></Link></div>
        {runs.length === 0 ? <p className="body-md text-on-surface-variant">Chưa có chuyến nào được chốt.</p> : (
          <div className="flex flex-col gap-3 stagger">
            {runs.map((r) => {
              const cmds = commands.filter((c) => c.c.run_id === r.id);
              const confirmed = cmds.filter((c) => c.c.status === "confirmed").length;
              const declined = cmds.filter((c) => c.c.status === "declined").length;
              return (
                <article key={r.id} className="m3-card-elevated" style={{ padding: "18px 22px", borderRadius: "var(--shape-xl)" }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="title-lg text-on-surface">Giao {formatYMD(r.delivery_date)}</p>
                      <p className="body-sm text-on-surface-variant">{r.total_orders} đơn · {r.total_boxes} hộp · {formatKg(Number(r.total_kg))} · chốt lúc {formatClock(r.cutoff_at)} · {confirmed}/{cmds.length} nông hộ đã xác nhận{declined ? ` · ${declined} hộ báo không cắt được` : ""}{Number(r.shortage_kg) > 0 ? ` · thiếu ${formatKg(Number(r.shortage_kg))}` : " · rau thừa 0%"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`status-pill status-${r.status}`}>{RUN_STATUS_LABELS[r.status]}</span>
                      <AdvanceRunButton runId={r.id} status={r.status} />
                    </div>
                  </div>
                  {r.summary && <p className="body-md text-on-surface" style={{ marginTop: 10, lineHeight: 1.6 }}><Icon name="psychology" size={16} className="text-primary" filled /> {r.summary}</p>}
                  <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
                    {cmds.map((c) => <span key={c.c.id} className={`m3-chip sm round ${c.c.status === "confirmed" ? "m3-chip-primary" : c.c.status === "declined" ? "m3-chip-error" : "m3-chip-surface"}`} title={c.c.message}><Icon name={c.c.status === "confirmed" ? "check_circle" : c.c.status === "declined" ? "cancel" : "schedule"} size={14} filled /> {addressFarmer(c.farmer ?? c.farm).call} · {formatKg(Number(c.c.total_kg))}</span>)}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="duyet">
        <div className="m3-section-head"><h2 className="title-lg text-on-surface"><Icon name="fact_check" filled /> Yêu cầu chờ duyệt</h2><span className="body-sm text-on-surface-variant">{requests.length ? `${requests.length} yêu cầu từ nông hộ` : "Nông hộ đổi thông tin vườn hoặc rau củ đăng ký đều phải qua đây"}</span></div>
        {requests.length === 0 ? <p className="body-md text-on-surface-variant">Không có yêu cầu nào đang chờ.</p> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {requests.map(({ r, farm, farmer }) => (
              <article key={r.id} className="m3-card-elevated" style={{ padding: "18px 20px", borderRadius: "var(--shape-xl)" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap" style={{ marginBottom: 12 }}>
                  <div>
                    <p className="title-md text-on-surface">{addressFarmer(farmer ?? farm.name).call} · {farm.name}</p>
                    <p className="body-sm text-on-surface-variant">{farm.location} · gửi lúc {formatClock(r.created_at)} {formatYMD(todayVN(r.created_at), { day: "numeric", month: "numeric" })}</p>
                  </div>
                  <span className="m3-chip sm round m3-chip-surface"><Icon name={r.kind === "farm" ? "storefront" : "scale"} size={14} filled /> {r.kind === "farm" ? "Thông tin vườn" : "Rau củ đăng ký"}</span>
                </div>
                <dl className="m3-diff">
                  {r.kind === "farm"
                    ? (Object.entries(r.payload as FarmChange) as [keyof FarmChange, string | null][]).map(([k, v]) => (
                        <div key={k} style={{ display: "contents" }}><dt>{FARM_FIELD_LABELS[k]}</dt><dd><del>{farm[k] || "(để trống)"}</del><br /><ins>{v || "(để trống)"}</ins></dd></div>
                      ))
                    : (r.payload as CapacityChange).map((c) => (
                        <div key={c.produce_id} style={{ display: "contents" }}><dt>{c.name}</dt><dd><del>{c.from_kg ? formatKg(c.from_kg) : "chưa đăng ký"}</del> → <ins>{c.to_kg ? `${formatKg(c.to_kg)} mỗi ngày` : "ngừng cung cấp"}</ins></dd></div>
                      ))}
                </dl>
                <RequestReview id={r.id} />
              </article>
            ))}
          </div>
        )}
      </section>

      <AdminPush counts={pushCounts} />
    </div>
  );
}
