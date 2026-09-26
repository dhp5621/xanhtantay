export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products, farms } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function SanPhamPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/dang-nhap");

  const userId = (session.user as { id: string }).id;
  const [myFarm] = await db.select().from(farms).where(eq(farms.owner_id, userId));
  const myProducts = myFarm
    ? await db.select().from(products).where(eq(products.farm_id, myFarm.id))
    : [];

  const catLabels: Record<string, string> = {
    rau_la: "Rau lá",
    cu_qua: "Củ quả",
    rau_thom: "Rau thơm",
    rau_mam: "Rau mầm",
  };

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--md-on-surface)", marginBottom: 2 }}>
            Sản phẩm 🥬
          </h1>
          <p style={{ fontSize: 14, color: "var(--md-on-surface-variant)" }}>
            Quản lý danh sách và tồn kho
          </p>
        </div>
        <button className="m3-filled-button">+ Thêm sản phẩm</button>
      </div>

      <div className="flex flex-col gap-3">
        {myProducts.map((p) => (
          <div
            key={p.id}
            className="m3-card"
            style={{
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: p.in_stock ? 1 : 0.6,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <p style={{ fontWeight: 600, fontSize: 15, color: "var(--md-on-surface)" }}>
                  {p.name}
                </p>
                <span className="m3-chip" style={{ fontSize: 11 }}>
                  {catLabels[p.category] ?? p.category}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--md-primary)", fontWeight: 600, marginTop: 2 }}>
                {p.price_per_unit.toLocaleString("vi-VN")}₫ / {p.unit}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "var(--radius-full)",
                  background: p.in_stock ? "var(--md-primary-container)" : "var(--md-error-container)",
                  color: p.in_stock ? "var(--md-on-primary-container)" : "var(--md-on-error-container)",
                }}
              >
                {p.in_stock ? "Còn hàng" : "Hết hàng"}
              </span>
              <button
                className="m3-outlined-button"
                style={{ padding: "5px 12px", fontSize: 12 }}
              >
                Sửa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
