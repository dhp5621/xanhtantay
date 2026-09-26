import Link from "next/link";
import { db } from "@/db";
import { farms } from "@/db/schema";

export default async function FarmsPage() {
  const allFarms = await db.select().from(farms);

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--md-on-surface)", marginBottom: 4 }}>
        Vườn rau 🌿
      </h1>
      <p style={{ fontSize: 15, color: "var(--md-on-surface-variant)", marginBottom: 28 }}>
        Đặt hàng trực tiếp từ những người nông dân thực sự
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {allFarms.map((farm) => (
          <Link key={farm.id} href={`/farms/${farm.slug}`} style={{ textDecoration: "none" }}>
            <div
              className="m3-card-elevated"
              style={{ cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }}
            >
              <div
                style={{
                  height: 180,
                  background: farm.cover_url
                    ? `url(${farm.cover_url}) center/cover`
                    : "var(--md-primary-container)",
                }}
              />
              <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16, color: "var(--md-on-surface)" }}>
                  {farm.name}
                </h2>
                <p style={{ fontSize: 13, color: "var(--md-primary)", fontWeight: 500 }}>
                  📍 {farm.location}
                </p>
                <p style={{ fontSize: 13, color: "var(--md-on-surface-variant)", lineHeight: 1.55, flex: 1 }}>
                  {farm.description}
                </p>
                <span
                  className="m3-tonal-button"
                  style={{ alignSelf: "flex-start", padding: "6px 16px", fontSize: 13 }}
                >
                  Xem vườn →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
