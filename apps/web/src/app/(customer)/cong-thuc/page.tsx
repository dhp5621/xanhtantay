export const dynamic = "force-dynamic";
import { db } from "@/db";
import { recipes } from "@/db/schema";

export default async function CongThucPage() {
  const allRecipes = await db.select().from(recipes);

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--md-on-surface)", marginBottom: 4 }}>
        Gợi ý bếp núc 🍳
      </h1>
      <p style={{ fontSize: 14, color: "var(--md-on-surface-variant)", marginBottom: 28 }}>
        Công thức được gợi ý từ những gì bạn vừa mua
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {allRecipes.map((recipe) => (
          <div key={recipe.id} className="m3-card-elevated" style={{ overflow: "hidden" }}>
            <div
              style={{
                background: "var(--md-primary-container)",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>🥘</span>
              <h2 style={{ fontWeight: 700, fontSize: 17, color: "var(--md-on-primary-container)" }}>
                {recipe.title}
              </h2>
            </div>

            <div style={{ padding: "16px 20px" }}>
              <div style={{ marginBottom: 14 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                    color: "var(--md-on-surface-variant)",
                    marginBottom: 8,
                  }}
                >
                  Nguyên liệu
                </p>
                <div className="flex flex-wrap gap-2">
                  {(recipe.ingredients as string[]).map((ing, i) => (
                    <span key={i} className="m3-chip">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                    color: "var(--md-on-surface-variant)",
                    marginBottom: 8,
                  }}
                >
                  Cách làm
                </p>
                <ol style={{ paddingLeft: 16 }}>
                  {(recipe.steps as string[]).map((step, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 14,
                        color: "var(--md-on-surface)",
                        lineHeight: 1.6,
                        marginBottom: 4,
                      }}
                    >
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
