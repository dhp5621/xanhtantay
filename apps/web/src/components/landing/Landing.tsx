import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ORDER_STATUS_LABELS } from "@xanhtantay/types";
import { stripEmoji } from "@/lib/format";

interface FarmCard { id: string; name: string; slug: string; location: string; cover_url: string | null }

const PILLAR_TONES = ["primary", "tertiary", "secondary", "primary"] as const;

const PILLARS = [
  {
    icon: "verified",
    eyebrow: "Minh bạch nguồn gốc",
    title: "Thấy vườn trước khi thấy rau",
    items: [
      { icon: "auto_stories", t: "Nhật ký nông trại", d: "Ảnh, video ngắn mỗi ngày từ vườn: gieo hạt, tưới nước, thu hoạch.", more: "Mỗi bài có giờ đăng chính xác. Bạn thấy luống rau mình sắp ăn lớn lên từng ngày, và biết ai đang chăm nó. Video giới hạn 30 giây để xem nhanh, tải nhẹ." },
      { icon: "videocam", t: "Livestream tại vườn", d: "Xem bác nông dân thu hoạch trực tiếp và chốt đơn ngay trên phiên live.", more: "Theo dõi vườn để nhận thông báo khi lên sóng. Trong phiên live, món đang hái hiện ngay dưới màn hình để bạn thêm vào giỏ mà không rời khỏi video. (Sắp ra mắt)" },
    ],
  },
  {
    icon: "shopping_cart_checkout",
    eyebrow: "Đặt hàng thông minh",
    title: "Mua theo cách hợp với nhà bạn",
    items: [
      { icon: "event_repeat", t: "Hộp rau gia đình định kỳ", d: "Một mức giá cố định mỗi tuần hoặc mỗi tháng, tự lên đơn, đổi món linh hoạt trước ngày giao 24h.", more: "Chọn món một lần từ trang vườn rồi bấm “Giao định kỳ”. Hệ thống tự lên đơn mỗi kỳ và trừ tồn kho của vườn. Tạm dừng, bật lại hay đổi món bất cứ lúc nào trong mục Gói đăng ký." },
      { icon: "groups", t: "Gom đơn chung", d: "Rủ hàng xóm cùng toà nhà mua chung một chuyến xe để chia phí gom. Đủ nhóm là miễn phí ship.", more: "Tạo nhóm, đặt số người tối thiểu và hạn chốt, chia link mời. Thanh tiến độ hiện ngay cần thêm mấy người. Đủ người trước hạn là cả nhóm được miễn phí vận chuyển về một điểm nhận chung." },
    ],
  },
  {
    icon: "favorite",
    eyebrow: "Theo dõi có cảm xúc",
    title: "Không còn “đang giao” khô khan",
    items: [
      { icon: "agriculture", t: stripEmoji(ORDER_STATUS_LABELS.harvesting), d: "", more: "Bước 1. Nhà vườn nhận đơn và hái đúng phần của bạn vào sáng hôm giao. Rau chưa bao giờ nằm kho." },
      { icon: "local_shipping", t: stripEmoji(ORDER_STATUS_LABELS.loaded), d: "", more: "Bước 2. Nhà vườn bấm một nút khi xe lạnh rời vườn. Bạn thấy trạng thái đổi ngay trong mục Đơn hàng." },
      { icon: "home", t: stripEmoji(ORDER_STATUS_LABELS.delivered), d: "", more: "Bước 3. Giao tận cửa, thanh toán khi nhận. Từ đây app gợi ý luôn hôm nay nấu gì với những món vừa về." },
    ],
  },
  {
    icon: "skillet",
    eyebrow: "Tiện ích bếp núc",
    title: "Mua gì, gợi ý nấu nấy",
    items: [
      { icon: "restaurant", t: "Gợi ý mâm cơm", d: "Mua bí đỏ và thịt băm, app gợi ý ngay canh bí đỏ thịt băm với công thức từng bước.", more: "Công thức được ghép từ chính những món trong đơn của bạn: nguyên liệu, số bước, cách làm ngắn gọn kiểu bếp nhà. Không có công thức khớp thì AI gợi ý thêm 2–3 món đơn giản." },
    ],
  },
];

const FARMER_POINTS = [
  { icon: "storefront", t: "Bán thẳng cho người ăn", d: "Thay 3–5 khâu trung gian bằng một nền tảng. Bạn tự đặt giá bán; Xanh Tận Tay chỉ thu 5–10% trên mỗi đơn giao thành công.", more: "Ví dụ: bó cải bạn bán 8.000₫, khách trả 8.000₫ cộng phí vận chuyển gom. Nền tảng giữ lại tối đa 800₫, phần còn lại về bạn khi đơn giao xong. Đơn huỷ hoặc không giao được thì không mất phí." },
  { icon: "photo_camera", t: "Đăng bán theo đợt thu hoạch", d: "Có gì bán nấy, hái theo đơn đã chốt. Không tồn kho, không hao hụt.", more: "Mỗi sản phẩm có số lượng còn bán. Khách đặt là tự trừ, về 0 là tự ẩn “hết hàng”. Nhập lại số lượng khi có lứa mới, bấm một nút là mở bán lại." },
  { icon: "mic", t: "Đơn giản như nói chuyện", d: "Đăng nhật ký bằng ảnh, sắp tới bằng giọng nói. Không cần rành công nghệ.", more: "Chụp ảnh thẳng từ camera, chọn một câu gợi ý sẵn, bấm đăng. Ảnh và video tự nén trên điện thoại nên mạng yếu vẫn đăng được. Nhập bằng giọng nói đang được phát triển." },
  { icon: "event_repeat", t: "Đầu ra ổn định", d: "Khách đăng ký “hộp rau gia đình” tuần / tháng nghĩa là đơn đều, dễ lên kế hoạch gieo trồng.", more: "Mục Khách đăng ký cho bạn thấy ai nhận rau kỳ tới, món gì, bao nhiêu. Nhìn vào đó để biết tuần sau cần hái gì, tháng sau nên gieo gì." },
];

const DAY_STEPS = [
  { icon: "wb_twilight", time: "05:30", t: "Ra vườn, chụp một tấm ảnh", d: "Sương còn đọng trên lá. 30 giây trên điện thoại, khách thấy ngay." },
  { icon: "photo_camera", time: "06:00", t: "Đăng nhật ký", d: "Kể hôm nay hái gì, cây nào đang lớn. Khách tin hơn mỗi ngày." },
  { icon: "notifications_active", time: "07:00", t: "Đơn về", d: "Đơn lẻ, đơn gói, đơn gom của cả toà nhà, gom lại thành một danh sách hái." },
  { icon: "agriculture", time: "08:00", t: "Hái theo đơn đã chốt", d: "Không thừa, không thiếu, không tồn kho. Tồn kho tự trừ theo đơn." },
  { icon: "local_shipping", time: "11:00", t: "Bấm “đã lên xe”", d: "Xe lạnh về phố. Khách nhận thông báo “hàng đã lên xe lạnh về phố”." },
  { icon: "payments", time: "17:00", t: "Bấm “đã giao”, tiền về", d: "Khách trả khi nhận. Cuối ngày xem tổng doanh thu trên trang tổng quan." },
];

/** Fee model from the business plan, stated plainly on both sides. */
const FEES = [
  { icon: "percent", who: "Nhà vườn", t: "5–10% mỗi đơn thành công", d: "Không phí đăng bán, không phí tháng. Đơn không giao được thì không thu." },
  { icon: "package_2", who: "Người mua", t: "Phí đóng gói & vận chuyển gom", d: "Tính theo chuyến xe gom. Gom đơn đủ nhóm là được miễn." },
  { icon: "event_repeat", who: "Người mua", t: "Hộp rau gia đình giá cố định", d: "Gói tuần / tháng một mức giá, giao đúng hẹn, đổi món trước 24h." },
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
            Đặt mua nông sản tươi gom trực tiếp từ những nhà vườn có tên có mặt, như bác Ba, cô Tư, u Thắm. Xem nhật ký và livestream nông trại, đặt theo gói định kỳ hoặc gom đơn cùng hàng xóm, biết rau đang ở đâu, và được gợi ý nấu gì tối nay.
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
            <div key={p.eyebrow} className="m3-card-filled lift" style={{ padding: 24, overflow: "visible", borderRadius: "var(--shape-xl-inc)", background: `var(--md-${PILLAR_TONES[i % PILLAR_TONES.length]}-container)`, color: `var(--md-on-${PILLAR_TONES[i % PILLAR_TONES.length]}-container)` }}>
              <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                <span style={{ width: 48, height: 48, borderRadius: "var(--shape-lg)", background: "color-mix(in srgb, currentColor 14%, transparent)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name={p.icon} size={26} filled /></span>
                <div>
                  <p className="label-md" style={{ opacity: 0.75, textTransform: "uppercase" }}>{p.eyebrow}</p>
                  <p className="title-lg">{p.title}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {p.items.map((it) => (
                  <div key={it.t} className="m3-tint-tile m3-hover-card" tabIndex={0} style={{ display: "flex", gap: 12, alignItems: "flex-start", borderRadius: "var(--shape-md)", padding: "10px 14px" }}>
                    <Icon name={it.icon} size={22} filled />
                    <div>
                      <p className="title-sm">{it.t}</p>
                      {it.d && <p className="body-sm" style={{ opacity: 0.85 }}>{it.d}</p>}
                    </div>
                    <div className="m3-rich-tip" role="tooltip">
                      <p className="title-sm" style={{ marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name={it.icon} size={18} filled className="text-primary" /> {it.t}</p>
                      <p className="body-sm">{it.more}</p>
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
            <div key={p.t} className="m3-card lift m3-hover-card" tabIndex={0} style={{ padding: "20px 22px", display: "flex", gap: 14, alignItems: "flex-start", borderRadius: "var(--shape-xl)", background: "var(--md-surface-container-lowest)", overflow: "visible" }}>
              <span className="m3-list-leading" style={{ background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)" }}><Icon name={p.icon} filled /></span>
              <div>
                <p className="title-md text-on-surface">{p.t}</p>
                <p className="body-sm text-on-surface-variant" style={{ marginTop: 2, lineHeight: 1.55 }}>{p.d}</p>
              </div>
              <div className="m3-rich-tip" role="tooltip">
                <p className="title-sm" style={{ marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="info" size={18} filled className="text-primary" /> Cụ thể hơn</p>
                <p className="body-sm">{p.more}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="label-md text-on-surface-variant" style={{ marginTop: 24, marginBottom: 10, textTransform: "uppercase" }}>Một ngày của nhà vườn</p>
        <div className="m3-marquee" aria-label="Một ngày của nhà vườn">
          <div className="m3-marquee-track">
            {[0, 1].map((copy) =>
              DAY_STEPS.map((x, i) => (
                <article key={`${copy}-${x.t}`} aria-hidden={copy === 1 || undefined} className="m3-marquee-item m3-card-elevated" style={{ padding: "20px 20px 18px", borderRadius: "var(--shape-xl)", background: "var(--md-surface-container-lowest)" }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                    <span className="m3-list-leading" style={{ background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)" }}><Icon name={x.icon} filled /></span>
                    <span className="m3-chip sm round m3-chip-surface tabular">{x.time}</span>
                  </div>
                  <p className="label-sm text-primary" style={{ marginBottom: 2 }}>BƯỚC {i + 1}</p>
                  <p className="title-md text-on-surface">{x.t}</p>
                  <p className="body-sm text-on-surface-variant" style={{ marginTop: 4, lineHeight: 1.55 }}>{x.d}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Fees, transparent */}
      <section>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p className="m3-eyebrow">Chi phí minh bạch</p>
          <h2 className="headline-lg text-on-surface">Ai trả gì, nói rõ từ đầu</h2>
          <p className="body-md text-on-surface-variant" style={{ marginTop: 6, maxWidth: 560, marginInline: "auto" }}>Không có phí ẩn. Nhà vườn giữ trọn giá bán sau một khoản phí giao dịch nhỏ; người mua chỉ trả phần vận chuyển, và gom đơn là cách để không phải trả.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger">
          {FEES.map((f) => (
            <div key={f.t} className="m3-card-outlined lift" style={{ padding: "20px 22px", borderRadius: "var(--shape-xl)" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <span className="m3-list-leading"><Icon name={f.icon} filled /></span>
                <span className="m3-chip sm round m3-chip-surface">{f.who}</span>
              </div>
              <p className="title-md text-on-surface">{f.t}</p>
              <p className="body-sm text-on-surface-variant" style={{ marginTop: 4, lineHeight: 1.55 }}>{f.d}</p>
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
