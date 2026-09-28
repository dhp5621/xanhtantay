import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { farm_capacity, farms, produce } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const MAX_KG = 500;

async function load(userId: string) {
  const [farm] = await db.select().from(farms).where(eq(farms.owner_id, userId));
  if (!farm) return null;
  const [all, mine] = await Promise.all([
    db.select().from(produce).orderBy(asc(produce.name)),
    db.select().from(farm_capacity).where(eq(farm_capacity.farm_id, farm.id)),
  ]);
  // Every produce the platform sells, with what this farm registered for it (0 = does not grow it).
  const items = all.map((p) => ({ produce_id: p.id, name: p.name, category: p.category, image_url: p.image_url, daily_kg: mine.find((m) => m.produce_id === p.id)?.daily_kg ?? 0 }));
  return { farm: { id: farm.id, name: farm.name, location: farm.location, slug: farm.slug }, items, total_kg: items.reduce((s, i) => s + i.daily_kg, 0) };
}

async function farmer() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
  if (user.role !== "farmer") return { error: NextResponse.json({ error: "Không có quyền" }, { status: 403 }) };
  return { user };
}

/** What the farm registered to supply: the brain never commands more than this per day. */
export async function GET() {
  const f = await farmer();
  if (f.error) return f.error;
  const data = await load(f.user.id);
  return data ? NextResponse.json(data) : NextResponse.json({ error: "Bạn chưa có vườn" }, { status: 404 });
}

/** PUT { items: [{ produce_id, daily_kg }] } — 0 stops supplying that produce. Applies from the next cut-off. */
export async function PUT(req: Request) {
  const f = await farmer();
  if (f.error) return f.error;
  const [farm] = await db.select().from(farms).where(eq(farms.owner_id, f.user.id));
  if (!farm) return NextResponse.json({ error: "Bạn chưa có vườn" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { items?: { produce_id?: string; daily_kg?: number }[] };
  if (!Array.isArray(body.items) || !body.items.length) return NextResponse.json({ error: "Thiếu danh sách rau củ" }, { status: 400 });
  const known = new Set((await db.select({ id: produce.id }).from(produce)).map((p) => p.id));
  const wanted = new Map<string, number>();
  for (const it of body.items) {
    const kg = Math.round(Number(it.daily_kg));
    if (!it.produce_id || !known.has(it.produce_id)) return NextResponse.json({ error: "Có loại rau củ không hợp lệ" }, { status: 400 });
    if (!Number.isFinite(kg) || kg < 0 || kg > MAX_KG) return NextResponse.json({ error: `Sản lượng mỗi ngày từ 0 đến ${MAX_KG} kg` }, { status: 400 });
    wanted.set(it.produce_id, kg);
  }
  const mine = await db.select().from(farm_capacity).where(eq(farm_capacity.farm_id, farm.id));
  for (const [produceId, kg] of wanted) {
    const row = mine.find((m) => m.produce_id === produceId);
    if (kg === 0) { if (row) await db.delete(farm_capacity).where(eq(farm_capacity.id, row.id)); }
    else if (row) { if (row.daily_kg !== kg) await db.update(farm_capacity).set({ daily_kg: kg }).where(eq(farm_capacity.id, row.id)); }
    else await db.insert(farm_capacity).values({ farm_id: farm.id, produce_id: produceId, daily_kg: kg });
  }
  return NextResponse.json(await load(f.user.id));
}
