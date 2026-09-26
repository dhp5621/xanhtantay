import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

interface FarmCard { id: string; name: string; slug: string; location: string; cover_url: string | null }

const CUSTOMER_PERKS = [
  { icon: "visibility", title: "Thấy tận gốc", text: "Nhật ký canh tác mỗi ngày, ảnh thật, người thật. Bạn biết rau mình ăn trồng ở đâu, ai trồng." },
  { icon: "schedule", title: "Tươi trong ngày", text: "Thu hoạch buổi sáng theo đơn, xe lạnh về phố, giao chiều. Không tồn kho, không hàng cũ." },
  { icon: "groups", title: "Gom đơn freeship", text: "Rủ hàng xóm cùng mua. Đủ người là cả nhóm miễn phí giao hàng." },
  { icon: "event_repeat", title: "Giao định kỳ", text: "Chọn một lần, rau tự về mỗi tuần hoặc mỗi tháng. Dừng hay đổi món bất cứ lúc nào." },
  { icon: "skillet", title: "Gợi ý nấu gì", text: "Mua gì gợi ý nấy. Công thức đơn giản từ chính những món trong giỏ." },
  { icon: "payments", title: "Trả tiền khi nhận", text: "Thanh toán khi rau đến cửa. Không ưng, không lấy." },
];

const FARMER_PERKS = [
  { icon: "storefront", title: "Bán thẳng cho người ăn", text: "Không qua thương lái, giữ trọn giá trị công sức. Giá do bạn quyết." },
  { icon: "photo_camera", title: "Kể chuyện vườn", text: "Đăng nhật ký bằng điện thoại trong 30 giây. Khách càng tin, càng đặt nhiều." },
  { icon: "package_2", title: "Quản lý đơn đơn giản", text: "Ba trạng thái: thu hoạch, lên xe, đã giao. Một chạm là khách biết ngay." },
  { icon: "inventory_2", title: "Tồn kho theo mùa", text: "Bật tắt món còn hàng, đổi giá theo vụ. Không bao giờ nhận đơn thứ mình không có." },
  { icon: "event_repeat", title: "Thu nhập đều đặn", text: "Khách đăng ký gói tuần / tháng nghĩa là đơn ổn định, dễ lên kế hoạch gieo trồng." },
  { icon: "handshake", title: "Không phí ẩn", text: "Miễn phí tham gia. Chỉ chia sẻ khi bạn thực sự bán được." },
];

const STEPS = [
  { icon: "potted_plant", title: "Chọn vườn", text: "Xem nhật ký, chọn vườn bạn tin." },
  { icon: "shopping_basket", title: "Đặt rau", text: "Thêm vào giỏ, đặt lẻ hoặc gom đơn." },
  { icon: "agriculture", title: "Bác thu hoạch", text: "Rau hái theo đơn ngay sáng hôm đó." },
  { icon: "home", title: "Nhận tận cửa", text: "Theo dõi hành trình, trả tiền khi nhận." },
];

function PerkGrid({ perks, bg, fg }: { perks: typeof CUSTOMER_PERKS; bg: string; fg: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
      {perks.map((p) => (
        <div key={p.title} className="m3-card-filled lift" style={{ padding: "22px 22px 20px", borderRadius: "var(--shape-xl)" }}>
          <span className="m3-list-leading" style={{ background: bg, color: fg, width: 48, height: 48, borderRadius: "var(--shape-lg)", marginBottom: 14 }}>
            <Icon name={p.icon} size={26} filled />
          </span>
          <p className="title-md text-on-surface" style={{ marginBottom: 4 }}>{p.title}</p>
          <p className="body-sm text-on-surface-variant" style={{ lineHeight: 1.55 }}>{p.text}</p>
        </div>
      ))}
    </div>
  );
}

/** Marketing page shown at "/" to visitors who are not signed in. */
export function Landing({ farms, stats }: { farms: FarmCard[]; stats: { farms: number; products: number; groups: number } }) {
  return (
    <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="m3-hero anim-in-scale" style={{ padding: "clamp(40px, 7vw, 80px) clamp(20px, 6vw, 64px)" }}>
        <span className="m3-hero-blob" style={{ width: 380, height: 380, right: -100, top: -140 }} />
        <span className="m3-hero-blob" style={{ width: 240, height: 240, right: 220, bottom: -140, animationDelay: "-5s" }} />
        <div style={{ position: "relative", maxWidth: 640 }}>
          <span className="m3-chip round anim-in" style={{ marginBottom: 20, background: "var(--md-surface-container-lowest)", color: "var(--md-primary)", boxShadow: "none" }}>
            <Icon name="eco" size={18} filled /> Từ vườn đến tay bạn, không qua trung gian
          </span>
          <h1 className="display-lg anim-in delay-1" style={{ color: "var(--md-on-primary-container)", marginBottom: 18 }}>
            Rau tươi có tên người trồng
          </h1>
          <p className="body-lg anim-in delay-2" style={{ color: "var(--md-on-secondary-container)", maxWidth: 520, marginBottom: 32, fontSize: 18 }}>
            Đặt rau thẳng từ vườn nhà bác Ba, cô Tư, u Thắm. Xem vườn mỗi ngày, biết rau hái lúc nào, trả tiền khi rau đến cửa.
          </p>
          <div className="flex flex-wrap gap-3 anim-in delay-3">
            <Link href="/dang-nhap" className="m3-btn m3-btn-filled m3-btn-lg">
              <Icon name="shopping_basket" filled /><span>Dùng thử tài khoản khách</span>
            </Link>
            <Link href="/farms" className="m3-btn m3-btn-elevated m3-btn-lg">
              <Icon name="potted_plant" /><span>Xem các vườn</span>
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 anim-in delay-4" style={{ marginTop: 36 }}>
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

      {/* How it works */}
      <section>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p className="m3-eyebrow">Bốn bước</p>
          <h2 className="headline-lg text-on-surface">Rau đi từ luống đến bàn ăn thế nào</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
          {STEPS.map((s, i) => (
            <div key={s.title} className="m3-card lift" style={{ padding: "22px 20px", textAlign: "center", borderRadius: "var(--shape-xl)" }}>
              <span className="m3-step-dot done" style={{ width: 56, height: 56, borderRadius: "var(--shape-lg)", marginBottom: 12 }}><Icon name={s.icon} size={28} filled /></span>
              <p className="label-md text-primary" style={{ marginBottom: 2 }}>BƯỚC {i + 1}</p>
              <p className="title-md text-on-surface">{s.title}</p>
              <p className="body-sm text-on-surface-variant" style={{ marginTop: 4 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Customers */}
      <section>
        <div className="m3-section-head" style={{ marginBottom: 20 }}>
          <div>
            <p className="m3-eyebrow">Cho người mua</p>
            <h2 className="headline-lg text-on-surface">Vì sao chọn Xanh Tận Tay</h2>
          </div>
          <Link href="/dang-nhap" className="m3-btn m3-btn-tonal-primary"><Icon name="shopping_basket" /><span>Thử ngay với tài khoản demo</span></Link>
        </div>
        <PerkGrid perks={CUSTOMER_PERKS} bg="var(--md-primary-container)" fg="var(--md-on-primary-container)" />
      </section>

      {/* Farmers */}
      <section style={{ background: "var(--md-surface-container-low)", borderRadius: "var(--shape-xxl)", padding: "clamp(28px, 5vw, 48px)" }}>
        <div className="m3-section-head" style={{ marginBottom: 20 }}>
          <div>
            <p className="m3-eyebrow" style={{ color: "var(--md-tertiary)" }}>Cho nhà vườn</p>
            <h2 className="headline-lg text-on-surface">Bạn trồng, chúng tôi lo phần còn lại</h2>
          </div>
          <Link href="/dang-nhap" className="m3-btn m3-btn-tertiary"><Icon name="agriculture" /><span>Xem trang quản lý vườn</span></Link>
        </div>
        <PerkGrid perks={FARMER_PERKS} bg="var(--md-tertiary-container)" fg="var(--md-on-tertiary-container)" />
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
          <h2 className="headline-lg" style={{ marginBottom: 8 }}>Thử ngay, không cần đăng ký</h2>
          <p className="body-lg" style={{ opacity: 0.85, maxWidth: 520, margin: "0 auto 24px" }}>
            Hai tài khoản demo có sẵn đơn hàng, gói đăng ký và nhóm gom đơn để bạn xem toàn bộ trải nghiệm.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/dang-nhap" className="m3-btn m3-btn-lg" style={{ background: "var(--md-on-primary)", color: "var(--md-primary)" }}>
              <Icon name="shopping_basket" filled /><span>Tôi là khách hàng</span>
            </Link>
            <Link href="/dang-nhap" className="m3-btn m3-btn-lg" style={{ background: "var(--md-primary-container)", color: "var(--md-on-primary-container)" }}>
              <Icon name="agriculture" filled /><span>Tôi là nhà vườn</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
