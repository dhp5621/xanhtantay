export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { SmartImage } from "@/components/ui/SmartImage";
import { getFarms, getBoxes } from "@/lib/queries";
import { addressFarmer, formatKg } from "@/lib/commerce";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: (await getFarms(slug))[0]?.name ?? "Vườn rau" };
}

/** Read-only farm profile: who they are, where, and what they registered to grow. */
export default async function FarmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [[farm], boxes] = await Promise.all([getFarms(slug), getBoxes()]);
  if (!farm) notFound();
  const inBoxes = boxes.filter((b) => b.items.some((i) => i.farms.some((f) => f.id === farm.id)));
  const total = farm.grows.reduce((s, g) => s + g.daily_kg, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="m3-image-hero anim-in-scale" style={{ height: 300, background: "var(--md-primary-container)" }}>
        {farm.cover_url && <SmartImage src={farm.cover_url} alt={farm.name} style={{ position: "absolute", inset: 0 }} priority />}
        <div style={{ position: "absolute", bottom: 28, left: 28, right: 28, zIndex: 1, color: "#fff" }}>
          <p className="label-md" style={{ opacity: 0.85, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 6 }}><Icon name="location_on" size={16} filled /> {farm.location}</p>
          <h1 className="display-sm" style={{ color: "#fff" }}>{farm.name}</h1>
        </div>
      </div>

      <div className="m3-card-filled anim-in delay-1" style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", borderRadius: "var(--shape-xl)" }}>
        <Avatar name={farm.farmer} src={farm.farmer_avatar} size="lg" />
        <div style={{ flex: 1, minWidth: 200 }}>
          <p className="title-lg text-on-surface">{farm.farmer ? addressFarmer(farm.farmer).call : farm.name}</p>
          <p className="body-sm text-on-surface-variant">Nhận lệnh thu hoạch mỗi tối, cắt rau lúc 4h sáng, giao xe lạnh lúc 6h.</p>
        </div>
        <span className="m3-chip round m3-chip-primary"><Icon name="scale" size={18} /> Năng suất {formatKg(total)}/ngày</span>
      </div>

      {farm.description && <p className="body-lg text-on-surface-variant anim-in delay-1" style={{ maxWidth: 680, lineHeight: 1.7 }}>{farm.description}</p>}

      <section>
        <div className="m3-section-head"><h2 className="headline-sm text-on-surface"><Icon name="eco" filled /> Vườn đang trồng</h2><span className="body-sm text-on-surface-variant">Năng suất đã đăng ký mỗi ngày</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {farm.grows.map((g) => (
            <div key={g.produce_id} className="m3-card lift" style={{ padding: "12px 14px 12px 12px", display: "flex", gap: 12, alignItems: "center", borderRadius: "var(--shape-lg-inc)" }}>
              <span style={{ width: 64, height: 64, borderRadius: "var(--shape-lg)", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center", background: "var(--md-primary-container)", color: "var(--md-on-primary-container)" }}>{g.image_url ? <SmartImage src={g.image_url} alt={g.name} /> : <Icon name="eco" size={28} filled />}</span>
              <div><p className="title-sm text-on-surface">{g.name}</p><p className="label-lg text-primary tabular">{formatKg(g.daily_kg)} <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>/ ngày</span></p></div>
            </div>
          ))}
        </div>
      </section>

      {inBoxes.length > 0 && (
        <section>
          <div className="m3-section-head"><h2 className="headline-sm text-on-surface"><Icon name="inventory_2" filled /> Rau của vườn có trong</h2></div>
          <div className="m3-list-group stagger">
            {inBoxes.map((b) => (
              <Link key={b.id} href={`/hop-rau/${b.slug}`} className="m3-list-item">
                <span className="m3-list-leading"><Icon name="inventory_2" /></span>
                <span style={{ flex: 1 }}><span style={{ display: "block" }}>{b.name}</span><span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{b.items.filter((i) => i.farms.some((f) => f.id === farm.id)).map((i) => i.name).join(" · ")}</span></span>
                <span className="m3-list-trailing"><Icon name="chevron_right" /></span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
