import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { MixCard } from "@/components/box/MixCard";
import { CutoffBanner } from "@/components/ui/CutoffBanner";
import { ORDER_TIMELINE } from "@xanhtantay/types";
import { formatYMD, PILOT_CITY, SOURCE_PROVINCES } from "@/lib/commerce";
import { groupMixes, type BoxView } from "@/lib/queries";

interface FarmCard { id: string; name: string; slug: string; location: string; province: string; cover_url: string | null; farmer: string | null }

const STEPS = [
  { icon: "inventory_2", time: "Trước 18h00", title: "Bạn đặt hộp rau", text: "Chọn hộp theo mùa, đặt lẻ, định kỳ hoặc gom cùng toà nhà." },
  { icon: "psychology", time: "18h00", title: "Bộ não gom nhu cầu", text: "Chốt sổ, cộng tổng từng loại rau, chia lệnh về từng nông hộ theo năng suất." },
  { icon: "agriculture", time: "4h00", title: "Cắt đúng lượng", text: "Bác nông dân nhận một tin nhắn, cắt đúng số ký đã đặt. Không thừa." },
  { icon: "apartment", time: "16h00", title: "Có tại sảnh", text: "Xe lạnh về phố, hộp rau chờ bạn ở sảnh chung cư trong ngày." },
];

const CUSTOMER_PERKS = [
  { icon: "inventory_2", t: "Hộp theo mùa, mix từ nhiều vườn", d: "Không phải chọn từng mớ. Mỗi hộp là rau củ ngon nhất mùa này từ các vườn Bắc Kạn, Tuyên Quang.", more: "Ba cỡ: nhỏ 3 kg cho 2 người, vừa 5 kg cho 3–4 người, lớn 8 kg cho nhà đông người. Thực đơn mùa đổi theo vụ thu hoạch." },
  { icon: "event_repeat", t: "Gói định kỳ", d: "Hộp rau tự về mỗi tuần, miễn phí giao. Tạm dừng hay đổi cỡ hộp bất cứ lúc nào.", more: "Hệ thống tự lên đơn trước mỗi kỳ chốt sổ. Bạn chỉ cần xuống sảnh nhận rau." },
  { icon: "groups", t: "Gom đơn theo toà nhà", d: "Rủ hàng xóm cùng chung cư đặt chung một chuyến. Đủ nhóm là cả nhóm miễn ship.", more: "Tạo nhóm, chia link trong nhóm cư dân. Thanh tiến độ cho biết còn thiếu mấy nhà." },
  { icon: "schedule", t: "Theo dõi có giờ, có người", d: "Không còn “đang giao” khô khan: bạn biết 4h sáng ai đang cắt rau cho mình.", more: "Ba mốc: 4h00 thu hoạch, 6h00 lên xe lạnh, 16h00 có tại sảnh chung cư." },
  { icon: "qr_code_2", t: "Quét QR biết gốc", d: "Mã trên bao bì cho biết rau cắt lúc nào, từ vườn nào, của bác nào.", more: "Trang truy xuất không lộ thông tin người mua, chỉ có nguồn gốc và hành trình." },
  { icon: "menu_book", t: "Thực đơn kèm hộp", d: "Mỗi hộp có sẵn lịch nấu theo ngày, trưa và tối, kèm cách làm từng món.", more: "Rau lá xếp ăn trước, củ quả để sau, nên dùng hết hộp mà không bỏ phí." },
];

const FARMER_POINTS = [
  { icon: "sms", t: "Mỗi ngày một tin nhắn", d: "Không cần học dùng app. Lệnh thu hoạch là một câu rõ ràng, chữ to: cắt gì, bao nhiêu ký, mấy giờ xe tới." },
  { icon: "thumb_up", t: "Một nút duy nhất", d: "Đọc xong bấm “Đã hiểu & Xác nhận”. Hết." },
  { icon: "scale", t: "Cắt đúng lượng đã bán", d: "Rau đã có người đặt trước khi cắt, nên không còn cảnh được mùa mất giá hay rau thừa đổ bỏ." },
  { icon: "payments", t: "Bán thẳng, giữ trọn giá", d: "Không qua thương lái. Nền tảng chỉ thu 5–10% trên đơn giao thành công." },
];

export function Landing({ boxes, farms, stats, deliveryDate, cutoffAt }: { boxes: BoxView[]; farms: FarmCard[]; stats: { farms: number; clusters: number; boxes_delivered: number }; deliveryDate: string; cutoffAt: string }) {
  return (
    <div className="flex flex-col gap-16">
      <section className="m3-hero anim-in-scale" style={{ padding: "clamp(36px, 6vw, 72px) clamp(20px, 6vw, 64px)" }}>
        <span className="m3-hero-blob" style={{ width: 380, height: 380, right: -100, top: -140 }} />
        <span className="m3-hero-blob" style={{ width: 240, height: 240, right: 220, bottom: -140, animationDelay: "-5s" }} />
        <div style={{ position: "relative" }}>
          <span className="m3-chip round anim-in m3-chip-wrap" style={{ marginBottom: 20, background: "var(--md-surface-container-lowest)", color: "var(--md-primary)", boxShadow: "none" }}>
            <Icon name="eco" size={18} filled /> Thí điểm tại {PILOT_CITY} · rau từ {SOURCE_PROVINCES.join(" và ")}
          </span>
          <h1 className="display-lg anim-in delay-1" style={{ color: "var(--md-on-primary-container)", marginBottom: 14, maxWidth: 720 }}>Thùng rau mẹ gửi</h1>
          <p className="body-lg anim-in delay-2" style={{ color: "var(--md-on-secondary-container)", maxWidth: 620, marginBottom: 24, fontSize: 18 }}>
            Đặt hộp rau theo mùa trước 18h00. Sáng mai bác nông dân cắt đúng phần của bạn, chiều rau đã có tại sảnh chung cư.
          </p>
          <div className="anim-in delay-3" style={{ maxWidth: 560, marginBottom: 20 }}><CutoffBanner cutoffAt={cutoffAt} deliveryLabel={formatYMD(deliveryDate)} /></div>
          <div className="flex flex-wrap gap-3 anim-in delay-3">
            <Link href="/dang-nhap?role=customer" className="m3-btn m3-btn-filled m3-btn-lg"><Icon name="inventory_2" filled /><span>Dùng thử tài khoản khách</span></Link>
            <Link href="/dang-nhap?role=farmer" className="m3-btn m3-btn-elevated m3-btn-lg"><Icon name="agriculture" /><span>Tôi là nhà vườn</span></Link>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 anim-in delay-4" style={{ marginTop: 32 }}>
            {[{ v: stats.farms, l: "nông hộ đối tác" }, { v: stats.clusters, l: "cụm chung cư" }, { v: stats.boxes_delivered, l: "hộp đã giao" }, { v: "0%", l: "rau thừa" }].map((s) => (
              <div key={s.l}><p className="headline-md tabular" style={{ color: "var(--md-on-primary-container)" }}>{s.v}</p><p className="body-sm" style={{ color: "var(--md-on-secondary-container)" }}>{s.l}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div style={{ textAlign: "center", marginBottom: 28 }}><p className="m3-eyebrow">Mô hình kéo</p><h2 className="headline-lg text-on-surface">Đặt trước rồi mới cắt</h2></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
          {STEPS.map((s) => (
            <div key={s.title} className="m3-card lift" style={{ padding: "22px 20px", textAlign: "center", borderRadius: "var(--shape-xl)" }}>
              <span className="m3-step-dot done" style={{ width: 56, height: 56, borderRadius: "var(--shape-lg)", marginBottom: 12 }}><Icon name={s.icon} size={28} filled /></span>
              <p className="label-md text-primary tabular" style={{ marginBottom: 2 }}>{s.time}</p>
              <p className="title-md text-on-surface">{s.title}</p>
              <p className="body-sm text-on-surface-variant" style={{ marginTop: 4 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="m3-section-head"><div><p className="m3-eyebrow">Hộp mùa này</p><h2 className="headline-lg text-on-surface">Chọn mix, chọn size cho nhà bạn</h2></div><Link href="/hop-rau" className="m3-btn m3-btn-text m3-btn-sm"><span>Xem chi tiết</span><Icon name="arrow_forward" size={18} /></Link></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">{groupMixes(boxes).map((m) => <MixCard key={m.mix} mix={m} />)}</div>
      </section>

      <section>
        <div className="m3-section-head" style={{ marginBottom: 20 }}><div><p className="m3-eyebrow">Cho người mua</p><h2 className="headline-lg text-on-surface">Tiện như có mẹ gửi rau ra</h2></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {CUSTOMER_PERKS.map((p) => (
            <div key={p.t} className="m3-card-filled lift m3-hover-card" tabIndex={0} style={{ padding: "22px 22px 20px", borderRadius: "var(--shape-xl)", overflow: "visible" }}>
              <span className="m3-list-leading" style={{ width: 48, height: 48, borderRadius: "var(--shape-lg)", marginBottom: 14 }}><Icon name={p.icon} size={26} filled /></span>
              <p className="title-md text-on-surface" style={{ marginBottom: 4 }}>{p.t}</p>
              <p className="body-sm text-on-surface-variant" style={{ lineHeight: 1.55 }}>{p.d}</p>
              <div className="m3-rich-tip" role="tooltip"><p className="title-sm" style={{ marginBottom: 4 }}>{p.t}</p><p className="body-sm">{p.more}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="m3-card-filled" style={{ borderRadius: "var(--shape-xxl)", padding: "clamp(24px, 5vw, 44px)", background: "var(--md-secondary-container)", color: "var(--md-on-secondary-container)" }}>
        <p className="label-md" style={{ opacity: 0.75, textTransform: "uppercase", marginBottom: 6 }}>Theo dõi có cảm xúc</p>
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Bạn luôn biết hộp rau đang ở đâu</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ORDER_TIMELINE.slice(1).map((s) => (
            <div key={s.status} className="m3-tint-tile" style={{ display: "flex", gap: 14, alignItems: "center", borderRadius: "var(--shape-lg)", padding: "14px 16px" }}>
              <Icon name={s.icon} size={28} filled />
              <div><p className="headline-sm tabular">{s.time.replace(":00", "h00")}</p><p className="body-md">{s.label("bác Tư")}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "var(--md-surface-container-low)", borderRadius: "var(--shape-xxl)", padding: "clamp(28px, 5vw, 48px)" }}>
        <div className="m3-section-head" style={{ marginBottom: 20, alignItems: "flex-start" }}>
          <div style={{ maxWidth: 560 }}>
            <p className="m3-eyebrow" style={{ color: "var(--md-tertiary)" }}>Cho nhà vườn</p>
            <h2 className="headline-lg text-on-surface">Không cần rành công nghệ</h2>
            <p className="body-md text-on-surface-variant" style={{ marginTop: 6 }}>Giao diện chỉ có một màn hình. Mỗi tối một lệnh thu hoạch, bấm một nút là xong.</p>
          </div>
          <Link href="/dang-nhap?role=farmer" className="m3-btn m3-btn-tertiary"><Icon name="agriculture" /><span>Xem màn hình nhà vườn</span></Link>
        </div>
        <div className="m3-command" style={{ marginBottom: 16, background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)" }}>
          <p className="m3-command-text">“Bác Ba ơi, 4h sáng mai bác cắt đúng 15 kg cà rốt và 20 kg bắp cải nhé. Xe tải lạnh sẽ qua lấy lúc 6h.”</p>
          <div style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 22px", borderRadius: "var(--shape-full)", background: "var(--md-tertiary)", color: "var(--md-on-tertiary)", fontWeight: 700 }}><Icon name="thumb_up" filled /> Đã hiểu & Xác nhận</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
          {FARMER_POINTS.map((p) => (
            <div key={p.t} className="m3-card lift" style={{ padding: "20px 22px", display: "flex", gap: 14, alignItems: "flex-start", borderRadius: "var(--shape-xl)", background: "var(--md-surface-container-lowest)" }}>
              <span className="m3-list-leading" style={{ background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)" }}><Icon name={p.icon} filled /></span>
              <div><p className="title-md text-on-surface">{p.t}</p><p className="body-sm text-on-surface-variant" style={{ marginTop: 2, lineHeight: 1.55 }}>{p.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {farms.length > 0 && (
        <section>
          <div className="m3-section-head"><h2 className="headline-sm text-on-surface"><Icon name="potted_plant" filled /> Nông hộ đối tác</h2><Link href="/farms" className="m3-btn m3-btn-text m3-btn-sm"><span>Xem tất cả</span><Icon name="arrow_forward" size={18} /></Link></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
            {farms.map((farm) => (
              <Link key={farm.id} href={`/farms/${farm.slug}`} className="m3-card-elevated m3-card-action" style={{ borderRadius: "var(--shape-xl)" }}>
                <div className="m3-media-wrap" style={{ height: 130, position: "relative" }}>
                  {farm.cover_url ? <SmartImage src={farm.cover_url} alt={farm.name} className="m3-card-media" style={{ position: "absolute", inset: 0 }} /> : <div style={{ position: "absolute", inset: 0, background: "var(--md-primary-container)" }} />}
                </div>
                <div style={{ padding: "14px 18px 16px" }}>
                  <p className="title-md text-on-surface">{farm.name}</p>
                  <p className="body-sm text-on-surface-variant" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="location_on" size={14} filled /> {farm.location}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="anim-in" style={{ background: "var(--md-primary)", color: "var(--md-on-primary)", borderRadius: "var(--shape-xxl)", padding: "clamp(32px, 6vw, 56px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <span className="m3-hero-blob" style={{ width: 300, height: 300, left: -100, bottom: -160, background: "rgba(255,255,255,.12)" }} />
        <div style={{ position: "relative" }}>
          <h2 className="headline-lg" style={{ marginBottom: 8 }}>Thử cả hai đầu, không cần đăng ký</h2>
          <p className="body-lg" style={{ opacity: 0.85, maxWidth: 560, margin: "0 auto 24px" }}>Tài khoản khách có sẵn hộp rau đang trên xe lạnh, gói định kỳ và nhóm gom đơn. Tài khoản nhà vườn có lệnh thu hoạch để xác nhận.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/dang-nhap?role=customer" className="m3-btn m3-btn-lg" style={{ background: "var(--md-on-primary)", color: "var(--md-primary)" }}><Icon name="inventory_2" filled /><span>Tôi là khách hàng</span></Link>
            <Link href="/dang-nhap?role=farmer" className="m3-btn m3-btn-lg" style={{ background: "var(--md-primary-container)", color: "var(--md-on-primary-container)" }}><Icon name="agriculture" filled /><span>Tôi là nhà vườn</span></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
