export const dynamic = "force-dynamic";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Công thức" };

const PALETTE = [
  ["var(--md-primary-container)", "var(--md-on-primary-container)"],
  ["var(--md-tertiary-container)", "var(--md-on-tertiary-container)"],
  ["var(--md-secondary-container)", "var(--md-on-secondary-container)"],
];

export default async function CongThucPage() {
  const allRecipes = await db.select().from(recipes);

  return (
    <div>
      <PageHeader icon="skillet" eyebrow="Từ giỏ rau đến bàn ăn" title="Gợi ý bếp núc" subtitle="Công thức được gợi ý từ những gì bạn vừa mua" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 stagger">
        {allRecipes.map((recipe, idx) => {
          const [bg, fg] = PALETTE[idx % PALETTE.length];
          return (
            <article key={recipe.id} className="m3-card-elevated lift" style={{ borderRadius: "var(--shape-xl)" }}>
              <div style={{ background: bg, color: fg, padding: "22px 22px", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: 52, height: 52, borderRadius: "var(--shape-lg)", background: "rgba(255,255,255,.35)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="restaurant" size={28} filled />
                </span>
                <div>
                  <h2 className="title-lg">{recipe.title}</h2>
                  <p className="body-sm" style={{ opacity: 0.8 }}>{recipe.steps.length} bước · {recipe.ingredients.length} nguyên liệu</p>
                </div>
              </div>

              <div style={{ padding: "18px 22px 22px" }}>
                <p className="label-md text-on-surface-variant" style={{ marginBottom: 8, textTransform: "uppercase" }}>Nguyên liệu</p>
                <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
                  {recipe.ingredients.map((ing, i) => <span key={i} className="m3-chip sm">{ing}</span>)}
                </div>
                <p className="label-md text-on-surface-variant" style={{ marginBottom: 8, textTransform: "uppercase" }}>Cách làm</p>
                <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {recipe.steps.map((step, i) => (
                    <li key={i} className="body-md text-on-surface" style={{ display: "flex", gap: 10, lineHeight: 1.55 }}>
                      <span className="m3-step-dot done" style={{ width: 26, height: 26, fontSize: 12, flexShrink: 0 }}>{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
