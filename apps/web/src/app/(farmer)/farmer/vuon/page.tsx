export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { farms } from "@/db/schema";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { FarmForm, type FarmData } from "@/components/farmer/FarmForm";
import { getSessionUser } from "@/lib/session";
import { requestState } from "@/lib/requests";

export const metadata = { title: "Thông tin vườn" };

export default async function FarmInfoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?role=farmer&next=/farmer/vuon");
  if (user.role !== "farmer") redirect("/");
  const [farm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <Link href="/farmer" className="m3-btn m3-btn-text m3-btn-sm" style={{ alignSelf: "flex-start", marginLeft: -12, marginBottom: -12 }}><Icon name="arrow_back" size={18} /><span>Lệnh thu hoạch</span></Link>
      <PageHeader icon="storefront" eyebrow="Vườn của tôi" title="Thông tin vườn" subtitle="Tên, địa chỉ và lời giới thiệu khách hàng nhìn thấy. Thay đổi cần quản trị duyệt" />
      {farm ? <FarmForm initial={{ name: farm.name, location: farm.location, province: farm.province, description: farm.description, slug: farm.slug, ...(await requestState(farm.id, "farm")) } as FarmData} /> : <EmptyState icon="potted_plant" title="Tài khoản chưa gắn với vườn nào" description="Bác liên hệ điều phối để được gắn vườn." />}
    </div>
  );
}
