import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, products } from "@/db/schema";
import { inArray } from "drizzle-orm";

const CHAT_API_URL = "https://chat-api.chuyenbienhoa.com/v1/chat/completions";
const CHAT_API_MODEL = "gemini-flash-lite";

export async function POST(req: Request) {
  const body = await req.json();
  const { product_ids }: { product_ids: string[] } = body;

  if (!product_ids?.length) {
    return NextResponse.json({ error: "Cần danh sách sản phẩm" }, { status: 400 });
  }

  // Get product names to match against recipe ingredients
  const purchasedProducts = await db
    .select()
    .from(products)
    .where(inArray(products.id, product_ids));

  const productNames = purchasedProducts.map((p) => p.name.toLowerCase());

  // Find recipes whose ingredients overlap with purchased products
  const allRecipes = await db.select().from(recipes);
  const matched = allRecipes
    .map((recipe) => {
      const ings = (recipe.ingredients as string[]).map((i) => i.toLowerCase());
      const overlap = ings.filter((ing) =>
        productNames.some((name) => name.includes(ing) || ing.includes(name))
      );
      return { ...recipe, score: overlap.length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (matched.length > 0) {
    return NextResponse.json(matched);
  }

  // Fallback: call self-hosted chat API
  const apiKey = process.env.CHAT_API_SECRET;
  if (!apiKey) {
    return NextResponse.json([]);
  }

  try {
    const productList = purchasedProducts.map((p) => p.name).join(", ");
    const res = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: CHAT_API_MODEL,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Bạn là trợ lý gợi ý công thức nấu ăn. Chỉ trả lời bằng JSON thuần, không giải thích thêm.",
          },
          {
            role: "user",
            content: `Tôi vừa mua: ${productList}. Gợi ý 2-3 công thức nấu ăn đơn giản bằng tiếng Việt sử dụng những nguyên liệu này. Trả về JSON array với định dạng: [{"title": "...", "ingredients": ["..."], "steps": ["..."]}]`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json([]);

    const suggestions = JSON.parse(jsonMatch[0]);
    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json([]);
  }
}
