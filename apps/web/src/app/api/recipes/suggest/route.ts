import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, user_recipes, users } from "@/db/schema";
import { normalizePrefs, prefsToPrompt, DEFAULT_PREFS } from "@/lib/recipe-prefs";
import { getSessionUser } from "@/lib/session";
import { getPurchases, distinctNames } from "@/lib/purchases";
import { aiConfigured, chatJSON } from "@/lib/ai";

interface AiRecipe { title: string; description?: string; minutes?: number; kcal?: number; protein_g?: number; ingredients: string[]; steps: string[]; based_on?: string[] }

const SYSTEM = `Bạn là đầu bếp gia đình Việt Nam. Bạn gợi ý món ăn CHỈ dựa trên nguyên liệu khách vừa mua từ vườn, cộng thêm gia vị và nguyên liệu cơ bản trong bếp (thịt, trứng, tỏi, hành, nước mắm...). Mỗi món phải dùng ít nhất một món khách đã mua làm nguyên liệu chính. Trả về JSON thuần, không giải thích.`;

/**
 * POST { count?: 1..4, order_id?: string, exclude?: string[], replace_id?: string }
 * Generates personal recipes from what the signed-in customer actually bought and stores them.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Đăng nhập để nhận gợi ý riêng" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { count?: number; order_id?: string; exclude?: string[]; replace_id?: string; prefs?: unknown };
  const count = Math.min(4, Math.max(1, Number(body.count ?? 3)));

  // Preferences: sent with the request, else the ones saved on the account.
  let prefs = DEFAULT_PREFS;
  if (body.prefs !== undefined) prefs = normalizePrefs(body.prefs);
  else {
    const [me] = await db.select({ recipe_prefs: users.recipe_prefs }).from(users).where(eq(users.id, user.id));
    if (me?.recipe_prefs) prefs = normalizePrefs(me.recipe_prefs);
  }
  const tags = [prefs.goal === "normal" ? [] : [prefs.goal], prefs.tags].flat();

  const purchases = await getPurchases(user.id, { orderId: body.order_id });
  const names = distinctNames(purchases).slice(0, 12);
  if (!names.length) {
    return NextResponse.json({ error: body.order_id ? "Đơn này chưa giao đến bạn. Khi rau về tới cửa, trợ lý sẽ gợi ý ngay." : "Chưa có đơn nào được giao. Rau về tới tay bạn rồi trợ lý mới nấu nhé." }, { status: 400 });
  }

  // Titles already in history are excluded so "đổi món" really gives something new.
  const history = await db.select({ title: user_recipes.title }).from(user_recipes).where(eq(user_recipes.user_id, user.id)).orderBy(desc(user_recipes.created_at)).limit(30);
  const exclude = Array.from(new Set([...history.map((h) => h.title), ...(body.exclude ?? [])])).slice(0, 40);

  let generated: AiRecipe[] = [];
  let source: "ai" | "curated" = "ai";

  if (aiConfigured()) {
    const prompt = `Khách vừa nhận: ${names.join(", ")}.
${prefsToPrompt(prefs)}
${exclude.length ? `KHÔNG gợi ý lại các món: ${exclude.join("; ")}.` : ""}
Gợi ý ${count} món đơn giản, mỗi món dưới 40 phút, dùng nguyên liệu trên làm chính.
JSON array, mỗi phần tử: {"title": "...", "description": "1 câu hấp dẫn", "minutes": số phút, "kcal": kcal mỗi khẩu phần (số), "protein_g": gam đạm mỗi khẩu phần (số), "ingredients": ["... (định lượng cho ${prefs.servings} người)"], "steps": ["bước 1", "..."], "based_on": ["tên món đã mua được dùng"]}`;
    const out = await chatJSON<AiRecipe[]>(SYSTEM, prompt, { temperature: 0.8 });
    if (Array.isArray(out)) generated = out.filter((r) => r && typeof r.title === "string" && Array.isArray(r.ingredients) && Array.isArray(r.steps)).slice(0, count);
  }

  if (!generated.length) {
    // Fallback: curated recipes whose ingredients overlap the purchases, excluding history.
    source = "curated";
    const lower = names.map((n) => n.toLowerCase());
    const all = await db.select().from(recipes);
    generated = all
      .map((r) => {
        const hits = r.ingredients.filter((ing) => lower.some((n) => n.includes(ing.toLowerCase()) || ing.toLowerCase().includes(n)));
        return { r, score: hits.length, hits };
      })
      .filter((x) => x.score > 0 && !exclude.includes(x.r.title))
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(({ r, hits }) => ({ title: r.title, ingredients: r.ingredients, steps: r.steps, based_on: names.filter((n) => hits.some((h) => n.toLowerCase().includes(h.toLowerCase()) || h.toLowerCase().includes(n.toLowerCase()))) }));
    if (!generated.length) {
      return NextResponse.json({ error: aiConfigured() ? "AI đang bận, thử lại sau một chút" : "Chưa có công thức phù hợp với món bạn mua. Máy chủ chưa bật trợ lý AI." }, { status: 503 });
    }
  }

  if (body.replace_id) {
    await db.delete(user_recipes).where(and(eq(user_recipes.id, body.replace_id), eq(user_recipes.user_id, user.id)));
  }

  const rows = await db.insert(user_recipes).values(
    generated.map((g) => ({
      user_id: user.id,
      order_id: body.order_id ?? null,
      title: String(g.title).slice(0, 120),
      description: g.description ? String(g.description).slice(0, 300) : null,
      minutes: Number.isFinite(Number(g.minutes)) ? Math.round(Number(g.minutes)) : null,
      kcal: Number.isFinite(Number(g.kcal)) && Number(g.kcal) > 0 ? Math.round(Number(g.kcal)) : null,
      protein_g: Number.isFinite(Number(g.protein_g)) && Number(g.protein_g) > 0 ? Math.round(Number(g.protein_g)) : null,
      tags,
      ingredients: g.ingredients.map(String).slice(0, 20),
      steps: g.steps.map(String).slice(0, 12),
      based_on: (g.based_on?.length ? g.based_on : names.filter((n) => g.ingredients.some((i) => i.toLowerCase().includes(n.toLowerCase())))).map(String).slice(0, 8),
      source,
    }))
  ).returning();

  return NextResponse.json({ recipes: rows, purchased: names, source, prefs }, { status: 201 });
}
