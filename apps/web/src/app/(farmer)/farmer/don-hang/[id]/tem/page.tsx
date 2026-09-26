export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, order_items, products, farms, users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { PrintButton } from "@/components/farmer/PrintButton";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Tem QR" };

/** Printable package label with a QR code; scanning opens the public trace page. */
export default async function TemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getSessionUser())!;
  const [row] = await db.select({ o: orders, farm: farms, customer: { name: users.name } }).from(orders)
    .leftJoin(farms, eq(orders.farm_id, farms.id)).leftJoin(users, eq(orders.user_id, users.id)).where(eq(orders.id, id));
  if (!row || !row.farm || row.farm.owner_id !== user.id) notFound();
  const items = await db.select({ oi: order_items, p: products }).from(order_items).leftJoin(products, eq(order_items.product_id, products.id)).where(eq(order_items.order_id, id));
  const code = row.o.id.slice(0, 8).toUpperCase();

  return (
    <div className="max-w-md mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between no-print">
        <a href="/farmer/don-hang" className="m3-btn m3-btn-text m3-btn-sm"><Icon name="arrow_back" size={18} /><span>Đơn hàng</span></a>
        <PrintButton />
      </div>
      <div className="print-label" style={{ background: "#fff", color: "#191C19", borderRadius: 16, padding: 20, border: "1px solid #C0C9C0", display: "flex", gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/qr/${row.o.id}`} alt={`QR gói #${code}`} width={150} height={150} style={{ flexShrink: 0, borderRadius: 8 }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 18 }}>Xanh Tận Tay · #{code}</p>
          <p style={{ fontSize: 13, marginBottom: 6 }}>{row.farm.name} · {row.farm.location}</p>
          <p style={{ fontSize: 12, color: "#404943" }}>Cho: {row.customer?.name} · Hái {formatDate(new Date(), { day: "numeric", month: "numeric" })}</p>
          <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 13 }}>
            {items.map(({ oi, p }) => <li key={oi.id}>{Number(oi.quantity)} {p?.unit} {p?.name}</li>)}
          </ul>
          <p style={{ fontSize: 11, color: "#404943", marginTop: 8 }}>Quét mã để xem vườn, nhật ký và hành trình gói rau.</p>
        </div>
      </div>
      <p className="body-sm text-on-surface-variant no-print">In tem này và dán lên gói. Khách quét là thấy vườn, món trong gói và trạng thái giao.</p>
    </div>
  );
}
