import type { BoxMeal, BoxMealDay } from "@/db/schema";
import { DISH } from "@/db/menu";
import { aiConfigured, searchJSON } from "./ai";

export interface MenuItem { name: string; category: string; quantity_kg: number }
type Time = BoxMeal["time"];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();
const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const list = (v: unknown, maxItems: number, maxLen: number) => (Array.isArray(v) ? v.map((x) => text(x, maxLen)).filter(Boolean).slice(0, maxItems) : []);

/** Accepts only a dish that is cooked from this box, with a usable recipe. Anything else is dropped. */
function clean(raw: unknown, time: Time, items: MenuItem[]): BoxMeal | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const recipe = (r.recipe ?? {}) as Record<string, unknown>;
  const title = text(r.title, 80);
  const uses = list(r.uses, 4, 40).map((u) => items.find((i) => norm(i.name) === norm(u))?.name).filter((u): u is string => !!u);
  const ingredients = list(recipe.ingredients, 12, 90);
  const steps = list(recipe.steps, 8, 260);
  if (!title || !uses.length || ingredients.length < 2 || steps.length < 2) return null;
  const minutes = Math.round(Number(recipe.minutes));
  const source = text(r.source, 120);
  return { time, title, uses: [...new Set(uses)], ...(text(r.note, 160) ? { note: text(r.note, 160) } : {}), recipe: { ...(minutes >= 5 && minutes <= 240 ? { minutes } : {}), ingredients, steps }, source: source || "AI tìm trên mạng" };
}

/** House dishes that can be cooked from this box, the ones sharing `prefer` produce first. */
function localDishes(items: MenuItem[], avoid: string[], prefer: string[] = []) {
  const have = new Set(items.map((i) => norm(i.name)));
  const skip = new Set(avoid.map(norm));
  return Object.values(DISH)
    .filter((d) => d.uses.every((u) => have.has(norm(u))) && !skip.has(norm(d.title)))
    .map((d) => ({ d, score: d.uses.filter((u) => prefer.some((p) => norm(p) === norm(u))).length + Math.random() * 0.5 }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.d);
}

const SYSTEM = `Bạn là trợ lý bếp của Xanh Tận Tay, dịch vụ giao hộp rau theo mùa ở Hà Nội.
BẮT BUỘC dùng tìm kiếm web để tìm công thức MỚI, đang được nhiều người nấu gần đây trên các trang ẩm thực, báo, video nấu ăn tiếng Việt. Ưu tiên công thức mới và biến tấu mới; KHÔNG lặp lại các món trong danh sách "đã có".
Quy tắc:
- Chỉ dùng rau củ có trong hộp làm nguyên liệu chính. Gia vị, thịt, cá, trứng, đậu phụ thông thường thì được thêm.
- "uses" chỉ gồm tên rau củ trong hộp, viết đúng như danh sách được cho.
- Món hợp bữa cơm gia đình Việt, nấu dưới 60 phút, nguyên liệu dễ mua ở Hà Nội.
- "source" là tên trang hoặc kênh nơi bạn tìm thấy công thức (ví dụ "Cookpad", "Điện máy XANH vào bếp"). Không bịa đường link.
- Trả lời CHỈ bằng JSON hợp lệ, không giải thích, không markdown.`;

const MEAL_SHAPE = `{"title": string, "uses": string[], "note": string (mẹo ngắn, có thể bỏ trống), "source": string, "recipe": {"minutes": number, "ingredients": string[] (tối đa 8, có định lượng), "steps": string[] (3 đến 6 bước ngắn gọn)}}`;
const box = (items: MenuItem[]) => items.map((i) => `${i.name} (${String(i.quantity_kg).replace(".", ",")} kg)`).join(", ");

/** One replacement dish for a meal. The customer's wish steers the search. */
export async function suggestMeal(input: { items: MenuItem[]; current: BoxMeal; avoid: string[]; wish?: string }): Promise<{ meal: BoxMeal; ai: boolean } | null> {
  const { items, current, avoid } = input;
  const wish = text(input.wish, 200);
  if (aiConfigured()) {
    const raw = await searchJSON<unknown>(SYSTEM, `Rau củ trong hộp: ${box(items)}.
Bữa ${current.time.toLowerCase()} đang là món "${current.title}" (dùng ${current.uses.join(", ")}). Khách muốn một cách làm KHÁC cho bữa này.
${wish ? `Ý khách: "${wish}".` : "Khách không nói thêm gì: hãy chọn một món đang được ưa chuộng gần đây."}
Ưu tiên vẫn dùng ${current.uses.join(", ")} để lượng rau trong tuần không bị lệch; chỉ đổi sang rau khác trong hộp nếu ý khách cần.
Các món đã có, không được lặp lại: ${avoid.join("; ")}.
Trả về một object JSON: ${MEAL_SHAPE}`, { temperature: 0.9, timeoutMs: 45_000 });
    const meal = clean(raw, current.time, items);
    if (meal && !avoid.some((a) => norm(a) === norm(meal.title))) return { meal, ai: true };
  }
  const [d] = localDishes(items, avoid, current.uses);
  return d ? { meal: { time: current.time, ...d }, ai: false } : null;
}

/** Leafy produce is eaten first, roots and squash keep until the end of the week. */
const perishableFirst = (items: MenuItem[]) => [...items].sort((a, b) => Number(b.category === "rau_la") - Number(a.category === "rau_la"));

async function aiDays(items: MenuItem[], days: number[], focus: MenuItem[], avoid: string[], wish: string): Promise<BoxMeal[][] | null> {
  const raw = await searchJSON<unknown>(SYSTEM, `Rau củ trong hộp: ${box(items)}.
Lên thực đơn cho các ngày ${days.join(", ")} của tuần, mỗi ngày hai bữa: trưa và tối. Mỗi bữa một món rau củ.
Những ngày này ưu tiên dùng: ${focus.map((i) => i.name).join(", ")}.
${wish ? `Ý khách: "${wish}".` : ""}
Các món đã có, không được lặp lại, và các món trong câu trả lời cũng không được trùng nhau: ${avoid.join("; ")}.
Trả về một mảng JSON, mỗi phần tử là một ngày: {"day": number, "lunch": MEAL, "dinner": MEAL} với MEAL = ${MEAL_SHAPE}`, { temperature: 1, timeoutMs: 50_000 });
  if (!Array.isArray(raw)) return null;
  return days.map((n) => {
    const d = (raw as Record<string, unknown>[]).find((x) => Number(x?.day) === n);
    return [clean(d?.lunch, "Trưa", items), clean(d?.dinner, "Tối", items)].filter((m): m is BoxMeal => !!m);
  });
}

/** A whole new week. Asked in two halves so each answer stays short enough to come back complete. */
export async function suggestWeek(input: { items: MenuItem[]; days: number; avoid: string[]; wish?: string }): Promise<{ plan: BoxMealDay[]; ai: boolean } | null> {
  const { items, days } = input;
  const wish = text(input.wish, 200);
  const order = perishableFirst(items);
  const numbers = Array.from({ length: days }, (_, i) => i + 1);
  const cut = Math.ceil(days / 2);
  const halves = [numbers.slice(0, cut), numbers.slice(cut)].filter((h) => h.length);
  const mid = Math.ceil(order.length / 2);

  let found: BoxMeal[][] = numbers.map(() => []);
  let ai = false;
  if (aiConfigured()) {
    const answers = await Promise.all(halves.map((h, k) => aiDays(items, h, k === 0 ? order.slice(0, mid + 1) : order.slice(mid - 1), input.avoid, wish)));
    answers.forEach((a, k) => a?.forEach((meals, j) => { found[halves[k][j] - 1] = meals; }));
    ai = found.some((m) => m.length > 0);
  }

  // Fill what the AI did not deliver (or everything, without AI) from the house dishes, never repeating a title.
  const used = new Set<string>();
  // Produce no dish has cooked yet: the week should get through everything in the box.
  const waiting = new Set(items.map((i) => norm(i.name)));
  found.flat().forEach((m) => m.uses.forEach((u) => waiting.delete(norm(u))));
  const plan: BoxMealDay[] = numbers.map((n, idx) => {
    const focus = (idx < cut ? order.slice(0, mid + 1) : order.slice(mid - 1)).map((i) => i.name);
    const meals = (["Trưa", "Tối"] as Time[]).map((time) => {
      const fromAi = found[idx].find((m) => m.time === time && !used.has(norm(m.title)));
      const pick = fromAi ?? (() => {
        const taken = [...used];
        const prefer = focus.filter((f) => waiting.has(norm(f)));
        const [d] = localDishes(items, [...(ai ? [] : input.avoid), ...taken], prefer.length ? prefer : focus);
        const [any] = d ? [d] : localDishes(items, taken, prefer.length ? prefer : focus);
        return any ? { time, ...any } : null;
      })();
      if (pick) { used.add(norm(pick.title)); pick.uses.forEach((u) => waiting.delete(norm(u))); }
      return pick;
    }).filter((m): m is BoxMeal => !!m);
    return { day: n, meals };
  });
  if (plan.some((d) => d.meals.length < 2)) return null;
  return { plan, ai };
}
