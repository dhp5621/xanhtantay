import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { farm_diary, farms, users } from "@/db/schema";

/**
 * One diary post plus its farm and every post of that farm (oldest → newest) — the data the web
 * /nhat-ky/[id] page renders as a swipeable pager, exposed as JSON for the mobile post viewer.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({ farm: farms, farmer: { name: users.name, avatar_url: users.avatar_url } })
    .from(farm_diary)
    .leftJoin(farms, eq(farm_diary.farm_id, farms.id))
    .leftJoin(users, eq(farms.owner_id, users.id))
    .where(eq(farm_diary.id, id));
  if (!row || !row.farm) return NextResponse.json({ error: "Không tìm thấy bài nhật ký" }, { status: 404 });

  const posts = await db.select().from(farm_diary).where(eq(farm_diary.farm_id, row.farm.id)).orderBy(asc(farm_diary.created_at)).limit(60);

  return NextResponse.json({
    farm: {
      id: row.farm.id,
      name: row.farm.name,
      slug: row.farm.slug,
      location: row.farm.location,
      cover_url: row.farm.cover_url,
      farmerName: row.farmer?.name ?? null,
      farmerAvatar: row.farmer?.avatar_url ?? null,
    },
    posts,
  });
}
