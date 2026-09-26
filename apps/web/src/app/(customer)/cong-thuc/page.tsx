export const dynamic = "force-dynamic";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { user_recipes } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getPurchases, distinctNames } from "@/lib/purchases";
import { aiConfigured } from "@/lib/ai";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecipeAssistant } from "@/components/recipes/RecipeAssistant";

export const metadata = { title: "Gợi ý mâm cơm" };

export default async function CongThucPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const user = await getSessionUser();

  if (!user) {
    return (
      <div>
        <PageHeader icon="skillet" eyebrow="Tiện ích bếp núc" title="Gợi ý mâm cơm" subtitle="AI gợi ý món ăn từ đúng những rau củ bạn đã mua" />
        <EmptyState icon="skillet" title="Đăng nhập để nhận gợi ý riêng" description="Mua bí đỏ và thịt băm, trợ lý gợi ý ngay canh bí đỏ thịt băm. Mỗi khách một thực đơn, lưu lại theo lịch sử mua." action={<Link href="/dang-nhap?next=/cong-thuc&role=customer" className="m3-btn m3-btn-filled"><Icon name="login" /><span>Đăng nhập</span></Link>} />
      </div>
    );
  }

  const [purchases, history] = await Promise.all([
    getPurchases(user.id, { limitOrders: 5 }),
    db.select().from(user_recipes).where(eq(user_recipes.user_id, user.id)).orderBy(desc(user_recipes.created_at)).limit(50),
  ]);
  const names = distinctNames(purchases);

  return (
    <div>
      <PageHeader icon="skillet" eyebrow="Tiện ích bếp núc" title="Gợi ý mâm cơm" subtitle={aiConfigured() ? "Trợ lý AI nấu từ đúng những gì bạn đã mua" : "Gợi ý từ những gì bạn đã mua"} />
      <RecipeAssistant purchased={names} initial={history} focusOrderId={order} ai={aiConfigured()} />
    </div>
  );
}
