import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ORDER_STATUS_LABELS } from "@xanhtantay/types";

interface FarmCard { id: string; name: string; slug: string; location: string; cover_url: string | null }

const PILLARS = [
  {
    icon: "verified",
    eyebrow: "Minh bạch nguồn gốc",
    title: "Thấy vườn trước khi thấy rau",
    items: [
      { icon: "auto_stories", t: "Nhật ký nông trại", d: "Ảnh, video ngắn mỗi ngày từ vườn: gieo hạt, tưới nước, thu hoạch." },
      { icon: "videocam", t: "Livestream tại vườn", d: "Xem bác nông dân thu hoạch trực tiếp và chốt đơn ngay trên phiên live." },
    ],
  },
  {
    icon: "shopping_cart_checkout",
    eyebrow: "Đặt hàng thông minh",
    title: "Mua theo cách hợp với nhà bạn",
    items: [
      { icon: "event_repeat", t: "Gói đăng ký định kỳ", d: "“Thùng rau mẹ gửi” mỗi tuần hoặc mỗi tháng, tự lên đơn, đổi món trước ngày giao." },
      { icon: "groups", t: "Gom đơn chung", d: "Rủ hàng xóm cùng toà nhà mua chung một chuyến xe. Đủ nhóm là freeship." },
    ],
  },
  {
    icon: "favorite",
    eyebrow: "Theo dõi có cảm xúc",
    title: "Không còn “đang giao” khô khan",
    items: [
      { icon: "agriculture", t: ORDER_STATUS_LABELS.harvesting, d: "" },
      { icon: "local_shipping", t: ORDER_STATUS_LABELS.loaded, d: "" },
      { icon: "home", t: ORDER_STATUS_LABELS.delivered, d: "" },
    ],
  },
  {
    icon: "skillet",
    eyebrow: "Tiện ích bếp núc",
    title: "Mua gì, gợi ý nấu nấy",
    items: [
      { icon: "restaurant", t: "Gợi ý mâm cơm", d: "Mua bí đỏ và thịt băm, app gợi ý ngay canh bí đỏ thịt băm với công thức từng bước." },
    ],
  },
];

const FARMER_POINTS = [
  { icon: "storefront", t: "Bán thẳng cho người ăn", d: "Không qua 3–5 khâu trung gian, không bị ép giá. Giá do bạn quyết, được mùa không mất giá." },
  { icon: "photo_camera", t: "Đăng bán theo đợt thu hoạch", d: "Có gì bán nấy, hái theo đơn đã chốt. Không tồn kho, không hao hụt." },
  { icon: "mic", t: "Đơn giản như nói chuyện", d: "Đăng nhật ký bằng ảnh, sắp tới bằng giọng nói. Không cần rành công nghệ." },
  { icon: "event_repeat", t: "Đầu ra ổn định", d: "Khách đăng ký gói tuần / tháng nghĩa là đơn đều, dễ lên kế hoạch gieo trồng." },
];

export function Landing({ farms, stats }: { farms: FarmCard[]; stats: { farms: number; products: number; groups: number } }) {
  return (
    <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="m3-hero anim-in-scale" style={{ padding: "clamp(36px, 6vw, 72px) clamp(20px, 6vw, 64px)" }}>
        <span className="m3-hero-blob" style={{ width: 380, height: 380, right: -100, top: -140 }} />
        <span className="m3-hero-blob" style={{ width: 240, height: 240, right: 220, bottom: -140, animationDelay: "-5s" }} />
        <div style={{ position: "relative" }}>
          <span className="m3-chip round anim-in m3-chip-wrap" style={{ marginBottom: 20, background: "var(--md-surface-container-lowest)", color: "var(--md-primary)", boxShadow: "none" }}>
            <Icon name="eco" size={18} filled /> Hệ sinh thái nông sản hai đầu: nhà vườn và người ăn
          </span>
          <h1 className="display-lg anim-in delay-1" style={{ color: "var(--md-on-primary-container)", marginBottom: 14, maxWidth: 720 }}>
            Rau tươi gom thẳng từ vườn, có tên người trồng
          </h1>
          <p className="body-lg anim-in delay-2" style={{ color: "var(--md-on-secondary-container)", maxWidth: 620, marginBottom: 28, fontSize: 18 }}>
            Đặt mua nông sản tươi gom trực tiếp từ vườn nhà bác Ba, cô Tư, u Thắm. Xem nhật ký và livestream nông trại, đặt theo gói định kỳ hoặc gom đơn cùng hàng xóm, biết rau đang ở đâu, và được gợi ý nấu gì tối nay.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 anim-in delay-3" style={{ maxWidth: 820 }}>
            <Link href="/dang-nhap?role=customer" className="m3-card-elevated m3-card-action" style={{ padding: "22px 22px 20px", borderRadius: "var(--shape-xl)", background: "var(--md-surface-container-lowest)" }}>
              <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
                <span className="m3-list-leading" style={{ width: 48, height: 48 }}><Icon name="shopping_basket" size={26} filled /></span>
                <div>
                  <p className="m3-eyebrow">App khách hàng</p>
                  <p className="title-lg text-on-surface">Xanh Tận Tay</p>
                </div>
              </div>
              <p className="body-md text-on-surface-variant" style={{ marginBottom: 12 }}>Mua rau biết gốc. Đặt lẻ, đăng ký định kỳ hay gom đơn chung, theo dõi rau từ luống đến cửa.</p>
              <span className="m3-btn m3-btn-filled m3-btn-sm"><span>Dùng thử tài khoản khách</span><Icon name="arrow_forward" size={18} /></span>
            </Link>
            <Link href="/dang-nhap?role=farmer" className="m3-card-elevated m3-card-action" style={{ padding: "22px 22px 20px", borderRadius: "var(--shape-xl)", background: "var(--md-surface-container-lowest)" }}>
              <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
                <span className="m3-list-leading" style={{ width: 48, height: 48, background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)" }}><Icon name="agriculture" size={26} filled /></span>
                <div>
                  <p className="m3-eyebrow" style={{ color: "var(--md-tertiary)" }}>App nông dân</p>
                  <p className="title-lg text-on-surface">Bạn của nhà nông</p>
                </div>
              </div>
              <p className="body-md text-on-surface-variant" style={{ marginBottom: 12 }}>Đăng bán theo đợt thu hoạch, cập nhật nhật ký bằng ảnh, nhận đơn và giao thẳng cho người ăn.</p>
              <span className="m3-btn m3-btn-tertiary m3-btn-sm"><span>Dùng thử tài khoản nhà vườn</span><Icon name="arrow_forward" size={18} /></span>
            </Link>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-2 anim-in delay-4" style={{ marginTop: 32 }}>
            {[
              { v: stats.farms, l: "vườn đang bán" },
              { v: stats.products, l: "loại rau củ" },
              { v: stats.groups, l: "nhóm gom đơn mở" },
            ].map((s) => (
              <div key={s.l}>
                <p className="headline-md tabular" style={{ color: "var(--md-on-primary-container)" }}>{s.v}</p>
                <p className="body-sm" style={{ color: "var(--md-on-secondary-container)" }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Four pillars */}
      <section>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p className="m3-eyebrow">Cho người mua</p>
          <h2 className="headline-lg text-on-surface">Bốn điều Xanh Tận Tay làm khác</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
          {PILLARS.map((p, i) => (
            <div key={p.eyebrow} className="m3-card-filled lift" style={{ padding: 24, borderRadius: "var(--shape-xl-inc)", background: i % 3 === 0 ? "var(--md-primary-container)" : i % 3 === 1 ? "var(--md-tertiary-container)" : "var(--md-secondary-container)", color: i % 3 === 0 ? "var(--md-on-primary-container)" : i % 3 === 1 ? "var(--md-on-tertiary-container)" : "var(--md-on-secondary-container)" }}>
              <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                <span style={{ width: 48, height: 48, borderRadius: "var(--shape-lg)", background: "rgba(255,255,255,.35)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name={p.icon} size={26} filled /></span>
                <div>
                  <p className="label-md" style={{ opacity: 0.75, textTransform: "uppercase" }}>{p.eyebrow}</p>
                  <p className="title-lg">{p.title}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {p.items.map((it) => (
                  <div key={it.t} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "rgba(255,255,255,.35)", borderRadius: "var(--shape-md)", padding: "10px 14px" }}>
                    <Icon name={it.icon} size={22} filled />
                    <div>
                      <p className="title-sm">{it.t}</p>
                      {it.d && <p className="body-sm" style={{ opacity: 0.85 }}>{it.d}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Farmers */}
      <section style={{ background: "var(--md-surface-container-low)", borderRadius: "var(--shape-xxl)", padding: "clamp(28px, 5vw, 48px)" }}>
        <div className="m3-section-head" style={{ marginBottom: 20, alignItems: "flex-start" }}>
          <div style={{ maxWidth: 560 }}>
            <p className="m3-eyebrow" style={{ color: "var(--md-tertiary)" }}>Cho nhà vườn · App nông dân</p>
            <h2 className="headline-lg text-on-surface">Bạn trồng, chúng tôi nối bạn với người ăn</h2>
            <p className="body-md text-on-surface-variant" style={{ marginTop: 6 }}>Giao diện cực kỳ đơn giản, thao tác bằng ảnh và sắp tới bằng giọng nói, dành cho người chưa quen công nghệ.</p>
          </div>
          <Link href="/dang-nhap?role=farmer" className="m3-btn m3-btn-tertiary"><Icon name="agriculture" /><span>Xem trang quản lý vườn</span></Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
          {FARMER_POINTS.map((p) => (
            <div key={p.t} className="m3-card lift" style={{ padding: "20px 22px", display: "flex", gap: 14, alignItems: "flex-start", borderRadius: "var(--shape-xl)", background: "var(--md-surface-container-lowest)" }}>
              <span className="m3-list-leading" style={{ background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)" }}><Icon name={p.icon} filled /></span>
              <div>
                <p className="title-md text-on-surface">{p.t}</p>
                <p className="body-sm text-on-surface-variant" style={{ marginTop: 2, lineHeight: 1.55 }}>{p.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger" style={{ marginTop: 16 }}>
          {[
            { icon: "photo_camera", t: "Sáng: đăng một tấm ảnh vườn", d: "30 giây trên điện thoại, khách thấy ngay." },
            { icon: "agriculture", t: "Trưa: hái theo đơn đã chốt", d: "Không thừa, không thiếu, không tồn kho." },
            { icon: "local_shipping", t: "Chiều: bấm “đã lên xe”", d: "Khách nhận thông báo, tiền về khi giao xong." },
          ].map((x) => (
            <div key={x.t} className="m3-card-outlined" style={{ padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start", borderRadius: "var(--shape-lg-inc)" }}>
              <Icon name={x.icon} className="text-primary" filled />
              <div>
                <p className="title-sm text-on-surface">{x.t}</p>
                <p className="body-sm text-on-surface-variant">{x.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Farms teaser */}
      {farms.length > 0 && (
        <section>
          <div className="m3-section-head">
            <h2 className="headline-sm text-on-surface"><Icon name="potted_plant" filled /> Những vườn đang bán</h2>
            <Link href="/farms" className="m3-btn m3-btn-text m3-btn-sm"><span>Xem tất cả</span><Icon name="arrow_forward" size={18} /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
            {farms.map((farm) => (
              <Link key={farm.id} href={`/farms/${farm.slug}`} className="m3-card-elevated m3-card-action" style={{ borderRadius: "var(--shape-xl)" }}>
                <div className="m3-media-wrap" style={{ height: 150, position: "relative" }}>
                  <div className="m3-card-media" style={{ position: "absolute", inset: 0, backgroundImage: farm.cover_url ? `url(${farm.cover_url})` : undefined, backgroundColor: "var(--md-primary-container)" }} />
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

      {/* Final CTA */}
      <section className="anim-in" style={{ background: "var(--md-primary)", color: "var(--md-on-primary)", borderRadius: "var(--shape-xxl)", padding: "clamp(32px, 6vw, 56px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <span className="m3-hero-blob" style={{ width: 300, height: 300, left: -100, bottom: -160, background: "rgba(255,255,255,.12)" }} />
        <div style={{ position: "relative" }}>
          <h2 className="headline-lg" style={{ marginBottom: 8 }}>Thử cả hai đầu, không cần đăng ký</h2>
          <p className="body-lg" style={{ opacity: 0.85, maxWidth: 560, margin: "0 auto 24px" }}>
            Tài khoản khách có sẵn đơn hàng, gói định kỳ và nhóm gom đơn. Tài khoản nhà vườn có đơn chờ hái và nhật ký để bạn đăng thử.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/dang-nhap?role=customer" className="m3-btn m3-btn-lg" style={{ background: "var(--md-on-primary)", color: "var(--md-primary)" }}>
              <Icon name="shopping_basket" filled /><span>Tôi là khách hàng</span>
            </Link>
            <Link href="/dang-nhap?role=farmer" className="m3-btn m3-btn-lg" style={{ background: "var(--md-primary-container)", color: "var(--md-on-primary-container)" }}>
              <Icon name="agriculture" filled /><span>Tôi là nhà vườn</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
