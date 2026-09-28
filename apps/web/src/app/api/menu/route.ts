import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, type BoxMealDay } from "@/db/schema";
import { getBox } from "@/lib/queries";
import { getSessionUser } from "@/lib/session";
import { suggestMeal, suggestWeek, type MenuItem } from "@/lib/menu-ai";

export const dynamic = "force-dynamic";
// Web search answers take a while; a whole week is two searches in parallel.
export const maxDuration = 60;

const titles = (plan: BoxMealDay[]) => plan.flatMap((d) => d.meals.map((m) => m.title));

/**
 * Change the menu that comes with a box.
 *   { action: "meal", day, meal, wish? }  one other way to cook that meal
 *   { action: "week", wish? }             a whole new week
 *   { action: "reset" }                   back to the box's own menu (orders only)
 * With `order_id` the result is saved on that order; with `box` (slug or id) nothing is stored
 * and the client sends the `plan` it is currently showing.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Đăng nhập để đổi thực đơn" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; order_id?: string; box?: string; day?: number; meal?: number; wish?: string; plan?: BoxMealDay[]; seen?: string[] };

  let order: typeof orders.$inferSelect | null = null;
  if (body.order_id) {
    [order] = await db.select().from(orders).where(eq(orders.id, String(body.order_id)));
    if (!order || order.user_id !== user.id) return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
  }
  const found = await getBox(order?.box_id ?? String(body.box ?? ""));
  if (!found) return NextResponse.json({ error: "Không tìm thấy hộp rau" }, { status: 404 });
  const qty = order?.quantity ?? 1;
  const items: MenuItem[] = found.items.map((i) => ({ name: i.name, category: i.category, quantity_kg: i.quantity_kg * qty }));

  if (body.action === "reset") {
    if (order) await db.update(orders).set({ meal_plan: null }).where(eq(orders.id, order.id));
    return NextResponse.json({ plan: found.meal_plan, customised: false, ai: false });
  }

  // Orders keep their own plan; on the box page the client owns it and only the shape is trusted.
  const sent = Array.isArray(body.plan) && body.plan.length === found.meal_plan.length && body.plan.every((d) => Array.isArray(d?.meals) && d.meals.every((m) => typeof m?.title === "string")) ? body.plan : null;
  const plan: BoxMealDay[] = order ? (order.meal_plan?.length ? order.meal_plan : found.meal_plan) : sent ?? found.meal_plan;
  const seen = Array.isArray(body.seen) ? body.seen.filter((s) => typeof s === "string").slice(0, 60).map((s) => s.slice(0, 80)) : [];
  const avoid = [...new Set([...titles(plan), ...titles(found.meal_plan), ...seen])];
  const save = async (next: BoxMealDay[]) => { if (order) await db.update(orders).set({ meal_plan: next }).where(eq(orders.id, order.id)); };

  if (body.action === "meal") {
    const day = plan.find((d) => d.day === Number(body.day));
    const index = Number(body.meal);
    const current = day?.meals[index];
    if (!day || !current) return NextResponse.json({ error: "Không tìm thấy bữa ăn này" }, { status: 400 });
    const r = await suggestMeal({ items, current, avoid, wish: body.wish });
    if (!r) return NextResponse.json({ error: "Chưa tìm được cách làm khác cho bữa này, bạn thử lại sau nhé" }, { status: 503 });
    const next = plan.map((d) => (d.day === day.day ? { ...d, meals: d.meals.map((m, i) => (i === index ? r.meal : m)) } : d));
    await save(next);
    return NextResponse.json({ plan: next, meal: r.meal, customised: true, ai: r.ai });
  }

  if (body.action === "week") {
    const r = await suggestWeek({ items, days: found.days, avoid, wish: body.wish });
    if (!r) return NextResponse.json({ error: "Chưa lên được thực đơn mới, bạn thử lại sau nhé" }, { status: 503 });
    await save(r.plan);
    return NextResponse.json({ plan: r.plan, customised: true, ai: r.ai });
  }
  return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
}
