export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { BoxContents } from "@/components/box/BoxContents";
import { BoxMenu } from "@/components/box/BoxMenu";
import { OrderPanel } from "@/components/box/OrderPanel";
import { SizePicker } from "@/components/box/SizePicker";
import { getBox, getBoxes, getClusters, getGroups } from "@/lib/queries";
import { getSessionUser } from "@/lib/session";
import { cutoffInstant, nextDeliveryDate, SIZE_LABELS, formatKg } from "@/lib/commerce";
import { formatVND } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: (await getBox(slug))?.name ?? "Hộp rau" };
}

export default async function BoxPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const box = await getBox(slug);
  if (!box) notFound();
  const user = await getSessionUser();
  const [all, clusters, groups, [me]] = await Promise.all([
    getBoxes(),
    getClusters(),
    getGroups({ onlyOpen: true }),
    user ? db.select({ cluster_id: users.cluster_id, address: users.address }).from(users).where(eq(users.id, user.id)) : Promise.resolve([]),
  ]);
  const sizes = all.filter((b) => b.mix === box.mix).sort((a, c) => a.weight_kg - c.weight_kg);
  const deliveryDate = nextDeliveryDate();
  const provinces = Array.from(new Set(box.items.flatMap((i) => i.farms.map((f) => f.province))));

  return (
    <div className="flex flex-col gap-8">
      <Link href="/hop-rau" className="m3-btn m3-btn-text m3-btn-sm anim-in" style={{ alignSelf: "flex-start", marginLeft: -12, marginBottom: -16 }}><Icon name="arrow_back" size={18} /><span>Tất cả hộp rau</span></Link>
      <div className="m3-box-layout">
        <div className="flex flex-col gap-8" style={{ minWidth: 0 }}>
          <div className="m3-image-hero anim-in-scale" style={{ height: 300, background: "var(--md-primary-container)" }}>
            {box.image_url && <SmartImage src={box.image_url} alt={box.name} style={{ position: "absolute", inset: 0 }} priority />}
            <div style={{ position: "absolute", bottom: 24, left: 24, right: 24, zIndex: 1, color: "#fff" }}>
              <p className="label-md" style={{ opacity: 0.9, marginBottom: 6 }}>{box.season} · {SIZE_LABELS[box.size]} · {formatKg(box.weight_kg)}</p>
              <h1 className="display-sm" style={{ color: "#fff" }}>{box.mix_name}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 anim-in delay-1">
            <span className="m3-chip round m3-chip-primary"><Icon name="payments" size={18} filled /> {formatVND(box.price)}</span>
            <span className="m3-chip round m3-chip-surface"><Icon name="group" size={18} /> {box.servings} người</span>
            <span className="m3-chip round m3-chip-surface"><Icon name="calendar_month" size={18} /> {box.days} ngày · {box.days * 2} bữa</span>
            <span className="m3-chip round m3-chip-surface"><Icon name="location_on" size={18} /> {provinces.join(" · ")}</span>
          </div>
          {box.description && <p className="body-lg text-on-surface-variant anim-in delay-1" style={{ lineHeight: 1.7, maxWidth: 680 }}>{box.description}</p>}
          <BoxContents items={box.items} hint={`${box.items.length} loại · mix từ ${new Set(box.items.flatMap((i) => i.farms.map((f) => f.id))).size} vườn`} />
          <BoxMenu plan={box.meal_plan} title="Thực đơn kèm hộp" />
        </div>
        <div className="m3-box-side anim-in delay-2 flex flex-col gap-4">
          <SizePicker sizes={sizes} current={box.id} />
          <OrderPanel
            box={{ id: box.id, slug: box.slug, name: box.name, price: box.price, weight_kg: box.weight_kg, days: box.days }}
            clusters={clusters}
            groups={groups.filter((g) => g.box_id === box.id).map((g) => ({ id: g.id, title: g.title, cluster_id: g.cluster_id, min_members: g.min_members, current_members: g.current_members, delivery_date: g.delivery_date }))}
            me={me ?? null}
            deliveryDate={deliveryDate}
            cutoffAt={cutoffInstant(deliveryDate).toISOString()}
          />
        </div>
      </div>
    </div>
  );
}
