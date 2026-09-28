export const dynamic = "force-dynamic";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { PageHeader } from "@/components/ui/PageHeader";
import { getFarms } from "@/lib/queries";
import { addressFarmer } from "@/lib/commerce";

export const metadata = { title: "Nông hộ đối tác" };

export default async function FarmsPage() {
  const farms = await getFarms();
  const provinces = Array.from(new Set(farms.map((f) => f.province)));
  return (
    <div>
      <PageHeader icon="potted_plant" eyebrow={provinces.join(" · ")} title="Nông hộ đối tác" subtitle="Những người cắt rau cho hộp của bạn lúc 4 giờ sáng" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 stagger">
        {farms.map((farm) => (
          <Link key={farm.id} href={`/farms/${farm.slug}`} className="m3-card-elevated m3-card-action" style={{ height: "100%", display: "flex", flexDirection: "column", borderRadius: "var(--shape-xl)" }}>
            <div className="m3-media-wrap" style={{ height: 190, position: "relative" }}>
              {farm.cover_url ? <SmartImage src={farm.cover_url} alt={farm.name} className="m3-card-media" style={{ position: "absolute", inset: 0 }} /> : <div style={{ position: "absolute", inset: 0, background: "var(--md-primary-container)" }} />}
              <span className="m3-chip sm round" style={{ position: "absolute", left: 12, bottom: 12, background: "rgba(0,0,0,.55)", color: "#fff", boxShadow: "none" }}><Icon name="location_on" size={16} filled /> {farm.location}</span>
            </div>
            <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <h2 className="title-lg text-on-surface">{farm.name}</h2>
              <p className="body-sm text-primary" style={{ fontWeight: 600 }}>{farm.farmer ? addressFarmer(farm.farmer).call : ""}</p>
              <p className="body-sm text-on-surface-variant" style={{ flex: 1, lineHeight: 1.55 }}>{farm.description}</p>
              <div className="flex flex-wrap gap-1">{farm.grows.map((g) => <span key={g.produce_id} className="m3-chip sm m3-chip-surface">{g.name}</span>)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
