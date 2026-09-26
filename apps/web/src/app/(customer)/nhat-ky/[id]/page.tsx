export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { farm_diary, farms, users } from "@/db/schema";
import { Icon } from "@/components/ui/Icon";
import { DiaryPostPager } from "@/components/farm/DiaryPostPager";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select({ content: farm_diary.content, farm: farms.name }).from(farm_diary).leftJoin(farms, eq(farm_diary.farm_id, farms.id)).where(eq(farm_diary.id, id));
  return { title: row ? `${row.farm} · ${row.content.slice(0, 60)}` : "Nhật ký vườn" };
}

/** A farm's diary as swipeable full posts, oldest → newest, opened at the requested post. */
export default async function NhatKyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select({ farm: farms, farmer: { name: users.name, avatar_url: users.avatar_url } })
    .from(farm_diary).leftJoin(farms, eq(farm_diary.farm_id, farms.id)).leftJoin(users, eq(farms.owner_id, users.id)).where(eq(farm_diary.id, id));
  if (!row || !row.farm) notFound();
  const { farm, farmer } = row;
  const posts = await db.select().from(farm_diary).where(eq(farm_diary.farm_id, farm.id)).orderBy(asc(farm_diary.created_at)).limit(60);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">
      <Link href={`/farms/${farm.slug}`} className="m3-btn m3-btn-text m3-btn-sm anim-in" style={{ alignSelf: "flex-start", marginLeft: -12 }}><Icon name="arrow_back" size={18} /><span>{farm.name}</span></Link>
      <div className="anim-in-scale">
        <DiaryPostPager
          posts={posts.map((p) => ({ id: p.id, content: p.content, media_urls: p.media_urls, created_at: p.created_at.toISOString() }))}
          farm={{ name: farm.name, slug: farm.slug, location: farm.location, farmerName: farmer?.name, farmerAvatar: farmer?.avatar_url }}
          initialId={id}
        />
      </div>
    </div>
  );
}
