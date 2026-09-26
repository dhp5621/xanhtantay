export const dynamic = "force-dynamic";
import { db } from "@/db";
import { products, farms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductManager } from "@/components/farmer/ProductManager";

export const metadata = { title: "Sản phẩm" };

export default async function SanPhamPage() {
  const user = (await getSessionUser())!;
  const [myFarm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));
  const myProducts = myFarm ? await db.select().from(products).where(eq(products.farm_id, myFarm.id)) : [];

  if (!myFarm) {
    return <EmptyState icon="potted_plant" title="Bạn chưa có vườn" description="Liên hệ quản trị để tạo vườn trước khi thêm sản phẩm." />;
  }

  return (
    <div>
      <PageHeader icon="eco" eyebrow={`${myProducts.filter((p) => p.in_stock).length}/${myProducts.length} còn hàng`} title="Sản phẩm" subtitle="Quản lý danh sách và tồn kho" />
      <ProductManager farmId={myFarm.id} initial={myProducts} />
    </div>
  );
}
