export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { farm_capacity, farms, produce } from "@/db/schema";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { CapacityEditor } from "@/components/farmer/CapacityEditor";
import { getSessionUser } from "@/lib/session";

export const metadata = { title: "Rau củ đăng ký" };

export default async function CapacityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?role=farmer&next=/farmer/nang-suat");
  if (user.role !== "farmer") redirect("/");
  const [farm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));
  const [all, mine] = farm ? await Promise.all([db.select().from(produce).orderBy(asc(produce.name)), db.select().from(farm_capacity).where(eq(farm_capacity.farm_id, farm.id))]) : [[], []];

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <Link href="/farmer" className="m3-btn m3-btn-text m3-btn-sm" style={{ alignSelf: "flex-start", marginLeft: -12, marginBottom: -12 }}><Icon name="arrow_back" size={18} /><span>Lệnh thu hoạch</span></Link>
      <PageHeader icon="scale" eyebrow={farm?.name ?? "Vườn của tôi"} title="Rau củ đăng ký" subtitle="Bác đăng ký mỗi ngày cắt được bao nhiêu ký mỗi loại" />
      {farm ? (
        <CapacityEditor initial={all.map((p) => ({ produce_id: p.id, name: p.name, category: p.category, image_url: p.image_url, daily_kg: mine.find((m) => m.produce_id === p.id)?.daily_kg ?? 0 }))} />
      ) : <EmptyState icon="potted_plant" title="Tài khoản chưa gắn với vườn nào" description="Bác liên hệ điều phối để được gắn vườn." />}
    </div>
  );
}
