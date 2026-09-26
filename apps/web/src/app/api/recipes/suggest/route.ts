import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, products } from "@/db/schema";
import { inArray } from "drizzle-orm";

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

  // If no DB matches, fall back to Claude API
  if (matched.length === 0 && process.env.ANTHROPIC_API_KEY) {
    try {
      // @ts-expect-error optional dependency
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic();
      const productList = purchasedProducts.map((p) => p.name).join(", ");

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `Tôi vừa mua: ${productList}. Gợi ý 2 công thức nấu ăn đơn giản bằng tiếng Việt. Trả về JSON array: [{title, ingredients: string[], steps: string[]}]`,
          },
        ],
      });

      const text = message.content[0].type === "text" ? message.content[0].text : "";
      const json = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
      return NextResponse.json(json);
    } catch {
      return NextResponse.json([]);
    }
  }

  return NextResponse.json(matched);
}
