import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { meal_plans, orders, order_items, products, users, type MealPlanDay } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { aiConfigured, chatJSON } from "@/lib/ai";
import { normalizePrefs, prefsToPrompt, DEFAULT_PREFS } from "@/lib/recipe-prefs";

interface AiPlan { days: number; summary: string; plan: MealPlanDay[] }

const SYSTEM = `Bạn là đầu bếp gia đình Việt Nam kiêm chuyên gia bảo quản rau củ. Từ số lượng rau củ khách vừa nhận, bạn ước tính ăn được bao nhiêu ngày và lên lịch nấu từng ngày sao cho dùng hết, món dễ hỏng nấu trước. Trả về JSON thuần.`;

/** POST { order_id, regenerate? } → meal plan for one DELIVERED order (cached per order). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { order_id?: string; regenerate?: boolean; prefs?: unknown };
  if (!body.order_id) return NextResponse.json({ error: "Thiếu đơn" }, { status: 400 });

  const [o] = await db.select().from(orders).where(and(eq(orders.id, body.order_id), eq(orders.user_id, user.id)));
  if (!o) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
  if (o.status !== "delivered") return NextResponse.json({ error: "Đơn chưa giao đến bạn. Rau về tới cửa rồi mới lên kế hoạch nhé." }, { status: 400 });

  if (!body.regenerate) {
    const [existing] = await db.select().from(meal_plans).where(eq(meal_plans.order_id, o.id)).orderBy(desc(meal_plans.created_at)).limit(1);
    if (existing) return NextResponse.json(existing);
  }

  const lines = await db.select({ oi: order_items, p: products }).from(order_items).leftJoin(products, eq(order_items.product_id, products.id)).where(eq(order_items.order_id, o.id));
  const inventory = lines.filter((l) => l.p).map((l) => `${Number(l.oi.quantity)} ${l.p!.unit} ${l.p!.name}`);
  if (!inventory.length) return NextResponse.json({ error: "Đơn không có món nào" }, { status: 400 });

  let prefs = DEFAULT_PREFS;
  if (body.prefs !== undefined) prefs = normalizePrefs(body.prefs);
  else {
    const [me] = await db.select({ recipe_prefs: users.recipe_prefs }).from(users).where(eq(users.id, user.id));
    if (me?.recipe_prefs) prefs = normalizePrefs(me.recipe_prefs);
  }

  let result: AiPlan | null = null;
  let source: "ai" | "rule" = "ai";
  if (aiConfigured()) {
    result = await chatJSON<AiPlan>(SYSTEM, `Khách vừa nhận: ${inventory.join(", ")}. ${prefsToPrompt(prefs)}
Ước tính số ngày dùng hết (mỗi ngày một gia đình ${prefs.servings} người ăn khoảng 250 g rau/người), tối đa 10 ngày, rau lá ăn trước, củ quả để sau.
Dữ liệu phải nhất quán: "days" đúng bằng số phần tử trong "plan", liệt kê đủ từng ngày cho tới khi hết rau. Mỗi ngày có ĐÚNG 2 bữa: "Trưa" và "Tối" (mỗi bữa một món chính dùng rau đã mua).
JSON: {"days": số ngày, "summary": "1–2 câu: ăn được mấy ngày, cách bảo quản", "plan": [{"day": 1, "meals": [{"time": "Trưa"|"Tối", "title": "tên món", "uses": ["rau nào, bao nhiêu"], "note": "mẹo ngắn (tuỳ chọn)"}], "leftover": "còn lại gì sau ngày này (tuỳ chọn)"}]}`, { temperature: 0.6, timeoutMs: 40_000 });
    if (result && (!Array.isArray(result.plan) || !Number.isFinite(Number(result.days)))) result = null;
  }
  if (!result) {
    // Rule-based fallback: ~250 g per person per day, lettuce-type first.
    source = "rule";
    const kg = lines.filter((l) => l.p?.unit === "kg").reduce((s, l) => s + Number(l.oi.quantity), 0);
    const pieces = lines.filter((l) => l.p && l.p.unit !== "kg").reduce((s, l) => s + Number(l.oi.quantity), 0);
    const days = Math.max(1, Math.min(10, Math.round((kg * 1000 + pieces * 300) / (250 * prefs.servings))));
    const names = lines.map((l) => l.p!.name);
    const plan: MealPlanDay[] = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      meals: [
        { time: "Trưa", title: `${names[i % names.length]} luộc / xào tỏi`, uses: [names[i % names.length]] },
        { time: "Tối", title: `Canh ${names[(i + 1) % names.length]}`, uses: [names[(i + 1) % names.length]] },
      ],
    }));
    result = { days, summary: `Khoảng ${days} ngày cho ${prefs.servings} người. Rau lá cất ngăn mát, dùng trong 3 ngày đầu; củ quả để nơi thoáng mát được lâu hơn.`, plan };
  }

  // Consistency only: the day count must match the days actually listed (meals per day are up to the AI).
  const planDays = result.plan.slice(0, 14).filter((d) => d && Array.isArray(d.meals) && d.meals.length);
  const days = Math.max(1, planDays.length);

  const [row] = await db.insert(meal_plans).values({
    user_id: user.id, order_id: o.id, days, prefs,
    summary: String(result.summary ?? "").slice(0, 400),
    plan: planDays.map((d, i) => {
      const meals = (d.meals ?? []).map((m) => ({ time: String(m.time ?? ""), title: String(m.title ?? ""), uses: (m.uses ?? []).map(String).slice(0, 6), note: m.note ? String(m.note).slice(0, 160) : undefined }));
      const pick = (label: string, idx: number) => meals.find((m) => m.time.toLowerCase().includes(label.toLowerCase())) ?? meals[idx];
      const lunch = pick("Trưa", 0), dinner = pick("Tối", 1) ?? pick("Chiều", 1);
      const two = [
        lunch ? { ...lunch, time: "Trưa" } : { time: "Trưa", title: `${inventory[i % inventory.length]?.replace(/^\d+\s*\S+\s*/, "") ?? "Rau"} xào tỏi`, uses: [] as string[] },
        dinner && dinner !== lunch ? { ...dinner, time: "Tối" } : { time: "Tối", title: `Canh ${inventory[(i + 1) % inventory.length]?.replace(/^\d+\s*\S+\s*/, "") ?? "rau"}`, uses: [] as string[] },
      ];
      return { day: i + 1, meals: two, leftover: d.leftover ? String(d.leftover).slice(0, 160) : undefined };
    }),
    source,
  }).returning();
  return NextResponse.json(row, { status: 201 });
}
