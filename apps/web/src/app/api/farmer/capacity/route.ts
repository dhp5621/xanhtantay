import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { farm_capacity, farms, produce, type CapacityChange } from "@/db/schema";
import { fileRequest, requestState, withdrawRequest } from "@/lib/requests";
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
  const state = await requestState(farm.id, "capacity");
  const asked = (state.pending?.payload ?? []) as CapacityChange;
  // `daily_kg` is what is in force; `pending_kg` is what the farmer asked for and the operator has not decided yet.
  const items = all.map((p) => ({ produce_id: p.id, name: p.name, category: p.category, image_url: p.image_url, daily_kg: mine.find((m) => m.produce_id === p.id)?.daily_kg ?? 0, pending_kg: asked.find((c) => c.produce_id === p.id)?.to_kg ?? null }));
  return { farm: { id: farm.id, name: farm.name, location: farm.location, slug: farm.slug }, items, total_kg: items.reduce((s, i) => s + i.daily_kg, 0), ...state };
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

/**
 * PUT { items: [{ produce_id, daily_kg }] } — asks to change the supply (0 = stop supplying).
 * Nothing changes until the operator approves it in /admin; a new request replaces the open one.
 */
export async function PUT(req: Request) {
  const f = await farmer();
  if (f.error) return f.error;
  const [farm] = await db.select().from(farms).where(eq(farms.owner_id, f.user.id));
  if (!farm) return NextResponse.json({ error: "Bạn chưa có vườn" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { items?: { produce_id?: string; daily_kg?: number }[] };
  if (!Array.isArray(body.items) || !body.items.length) return NextResponse.json({ error: "Thiếu danh sách rau củ" }, { status: 400 });
  const [all, mine] = await Promise.all([db.select().from(produce), db.select().from(farm_capacity).where(eq(farm_capacity.farm_id, farm.id))]);
  const change: CapacityChange = [];
  for (const it of body.items) {
    const kg = Math.round(Number(it.daily_kg));
    const p = all.find((x) => x.id === it.produce_id);
    if (!p) return NextResponse.json({ error: "Có loại rau củ không hợp lệ" }, { status: 400 });
    if (!Number.isFinite(kg) || kg < 0 || kg > MAX_KG) return NextResponse.json({ error: `Sản lượng mỗi ngày từ 0 đến ${MAX_KG} kg` }, { status: 400 });
    const now = mine.find((m) => m.produce_id === p.id)?.daily_kg ?? 0;
    if (kg !== now && !change.some((c) => c.produce_id === p.id)) change.push({ produce_id: p.id, name: p.name, from_kg: now, to_kg: kg });
  }
  if (!change.length) return NextResponse.json({ error: "Không có gì thay đổi so với đăng ký hiện tại" }, { status: 400 });
  await fileRequest(farm.id, "capacity", change);
  return NextResponse.json(await load(f.user.id), { status: 202 });
}

/** Withdraws the change that is still waiting for approval. */
export async function DELETE() {
  const f = await farmer();
  if (f.error) return f.error;
  const [farm] = await db.select().from(farms).where(eq(farms.owner_id, f.user.id));
  if (!farm) return NextResponse.json({ error: "Bạn chưa có vườn" }, { status: 404 });
  await withdrawRequest(farm.id, "capacity");
  return NextResponse.json(await load(f.user.id));
}
