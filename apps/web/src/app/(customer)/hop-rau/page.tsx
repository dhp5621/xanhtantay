export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/ui/PageHeader";
import { MixCard } from "@/components/box/MixCard";
import { CutoffBanner } from "@/components/ui/CutoffBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { getBoxes, groupMixes } from "@/lib/queries";
import { cutoffInstant, formatYMD, nextDeliveryDate } from "@/lib/commerce";

export const metadata = { title: "Hộp rau" };

export default async function HopRauPage() {
  const boxes = await getBoxes();
  const deliveryDate = nextDeliveryDate();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon="inventory_2" eyebrow={boxes[0]?.season ?? "Theo mùa"} title="Hộp rau theo mùa" subtitle="Chọn mix rau củ, rồi chọn size S, M hoặc L. Hộp nào cũng đủ ăn 7 ngày, kèm thực đơn từng ngày" />
      <CutoffBanner cutoffAt={cutoffInstant(deliveryDate).toISOString()} deliveryLabel={formatYMD(deliveryDate)} />
      {boxes.length === 0 ? <EmptyState icon="inventory_2" title="Chưa có hộp rau mùa này" description="Thực đơn mùa mới đang được xây dựng." /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">{groupMixes(boxes).map((m) => <MixCard key={m.mix} mix={m} />)}</div>
      )}
    </div>
  );
}
