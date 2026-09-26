import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meal_plans, users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { aiConfigured, chatJSON } from "@/lib/ai";
import { normalizePrefs, prefsToPrompt, DEFAULT_PREFS } from "@/lib/recipe-prefs";

interface AiRecipe { minutes?: number; ingredients: string[]; steps: string[] }

/** POST { plan_id, day, meal } → generates (once) and returns the how-to for one meal in a plan. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { plan_id?: string; day?: number; meal?: number };
  const day = Number(body.day), mealIdx = Number(body.meal);
  if (!body.plan_id || !Number.isInteger(day) || !Number.isInteger(mealIdx)) return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });

  const [plan] = await db.select().from(meal_plans).where(and(eq(meal_plans.id, body.plan_id), eq(meal_plans.user_id, user.id)));
  if (!plan) return NextResponse.json({ error: "Không tìm thấy kế hoạch" }, { status: 404 });
  const dayEntry = plan.plan.find((d) => d.day === day);
  const meal = dayEntry?.meals[mealIdx];
  if (!dayEntry || !meal) return NextResponse.json({ error: "Không có bữa này" }, { status: 404 });
  if (meal.recipe) return NextResponse.json(meal.recipe);

  const [me] = await db.select({ recipe_prefs: users.recipe_prefs }).from(users).where(eq(users.id, user.id));
  const prefs = me?.recipe_prefs ? normalizePrefs(me.recipe_prefs) : DEFAULT_PREFS;

  // Reuse a how-to already generated for the same dish (same title) anywhere in this user's plans,
  // so the AI is only asked once per dish, not once per day or per regenerated plan.
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const wanted = norm(meal.title);
  let recipe: AiRecipe | null = null;
  const mine = await db.select({ plan: meal_plans.plan }).from(meal_plans).where(eq(meal_plans.user_id, user.id));
  outer: for (const p of mine) for (const d of p.plan) for (const m of d.meals) {
    if (m.recipe && norm(m.title) === wanted) { recipe = m.recipe; break outer; }
  }

  if (!recipe && aiConfigured()) {
    recipe = await chatJSON<AiRecipe>(
      "Bạn là đầu bếp gia đình Việt Nam. Trả về JSON thuần.",
      `Viết cách làm món "${meal.title}" dùng nguyên liệu: ${meal.uses.join(", ") || "rau vừa mua"}. ${prefsToPrompt(prefs)}
JSON: {"minutes": số phút, "ingredients": ["nguyên liệu kèm định lượng cho ${prefs.servings} người"], "steps": ["bước 1", "bước 2", "..."]} — 5 đến 8 bước, ngắn gọn kiểu bếp nhà.`,
      { temperature: 0.5 }
    );
    if (recipe && (!Array.isArray(recipe.ingredients) || !Array.isArray(recipe.steps))) recipe = null;
  }
  if (!recipe) {
    recipe = {
      minutes: 20,
      ingredients: [...meal.uses, "tỏi, hành", "dầu ăn", "nước mắm, muối, tiêu"],
      steps: ["Rửa sạch rau củ, cắt vừa ăn.", "Phi thơm tỏi hành với chút dầu.", `Cho ${meal.uses[0] ?? "rau"} vào xào / nấu lửa vừa.`, "Nêm nước mắm, muối, tiêu cho vừa miệng.", "Tắt bếp, dọn ra dùng nóng."],
    };
  }
  const clean = { minutes: Number.isFinite(Number(recipe.minutes)) ? Math.round(Number(recipe.minutes)) : undefined, ingredients: recipe.ingredients.map(String).slice(0, 20), steps: recipe.steps.map(String).slice(0, 12) };

  const updated = plan.plan.map((d) => (d.day !== day ? d : { ...d, meals: d.meals.map((m, i) => (i === mealIdx ? { ...m, recipe: clean } : m)) }));
  await db.update(meal_plans).set({ plan: updated }).where(eq(meal_plans.id, plan.id));
  return NextResponse.json(clean);
}
