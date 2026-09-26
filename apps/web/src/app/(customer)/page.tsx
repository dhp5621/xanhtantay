import Link from "next/link";
import { db } from "@/db";
import { farms, farm_diary, group_orders } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export default async function HomePage() {
  const [allFarms, diaryFeed, openGroups] = await Promise.all([
    db.select().from(farms).limit(6),
    db.select().from(farm_diary).orderBy(desc(farm_diary.created_at)).limit(6),
    db.select().from(group_orders).where(eq(group_orders.status, "open")).limit(3),
  ]);

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(135deg, var(--md-primary-container) 0%, var(--md-secondary-container) 100%)",
          borderRadius: "var(--radius-xl)",
          padding: "40px 32px",
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--md-primary)",
            marginBottom: 8,
          }}
        >
          Nông sản tươi từ vườn
        </p>
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 44px)",
            fontWeight: 800,
            color: "var(--md-on-primary-container)",
            lineHeight: 1.15,
            maxWidth: 480,
            marginBottom: 16,
          }}
        >
          Biết rõ từng cây rau trước khi lên bàn ăn
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--md-on-secondary-container)",
            maxWidth: 440,
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          Đặt hàng trực tiếp từ vườn nhà bác Ba, cô Tư, u Thắm — xem hàng ngày
          nhật ký canh tác, biết rau thu hoạch lúc nào, giao đến tay bạn ra sao.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/farms" className="m3-filled-button" style={{ textDecoration: "none" }}>
            🌱 Khám phá vườn rau
          </Link>
          <Link href="/gom-don" className="m3-tonal-button" style={{ textDecoration: "none" }}>
            👥 Gom đơn cùng hàng xóm
          </Link>
        </div>
      </section>

      {/* Farms */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--md-on-surface)" }}>
            Vườn rau nổi bật
          </h2>
          <Link href="/farms" style={{ fontSize: 14, color: "var(--md-primary)", textDecoration: "none", fontWeight: 500 }}>
            Xem tất cả →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allFarms.map((farm) => (
            <Link key={farm.id} href={`/farms/${farm.slug}`} style={{ textDecoration: "none" }}>
              <div className="m3-card-elevated" style={{ cursor: "pointer", transition: "transform .2s" }}>
                <div
                  style={{
                    height: 160,
                    background: farm.cover_url
                      ? `url(${farm.cover_url}) center/cover`
                      : "var(--md-primary-container)",
                    display: "flex",
                    alignItems: "flex-end",
                    padding: "12px",
                  }}
                >
                  <span
                    style={{
                      background: "rgba(0,0,0,.5)",
                      backdropFilter: "blur(4px)",
                      color: "#fff",
                      borderRadius: "var(--radius-sm)",
                      padding: "3px 8px",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    📍 {farm.location}
                  </span>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: "var(--md-on-surface)", marginBottom: 4 }}>
                    {farm.name}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--md-on-surface-variant)",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {farm.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Diary feed */}
      <section>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--md-on-surface)", marginBottom: 16 }}>
          Nhật ký từ vườn 📖
        </h2>
        <div className="flex flex-col gap-3">
          {diaryFeed.map((entry) => {
            const farm = allFarms.find((f) => f.id === entry.farm_id);
            return (
              <div
                key={entry.id}
                className="m3-card"
                style={{ padding: "16px", display: "flex", gap: 14 }}
              >
                {entry.media_urls[0] && (
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "var(--radius-md)",
                      background: `url(${entry.media_urls[0]}) center/cover`,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--md-primary)",
                      marginBottom: 4,
                    }}
                  >
                    {farm?.name ?? "Vườn rau"}
                  </p>
                  <p style={{ fontSize: 14, color: "var(--md-on-surface)", lineHeight: 1.55 }}>
                    {entry.content}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--md-on-surface-variant)", marginTop: 6 }}>
                    {new Date(entry.created_at).toLocaleDateString("vi-VN", {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Group buying */}
      {openGroups.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--md-on-surface)" }}>
              Gom đơn đang mở 👥
            </h2>
            <Link href="/gom-don" style={{ fontSize: 14, color: "var(--md-primary)", textDecoration: "none", fontWeight: 500 }}>
              Xem tất cả →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {openGroups.map((group) => {
              const farm = allFarms.find((f) => f.id === group.farm_id);
              const pct = Math.round((group.current_members / group.min_members) * 100);
              const freeship = group.current_members >= group.min_members;
              return (
                <Link key={group.id} href={`/gom-don/${group.id}`} style={{ textDecoration: "none" }}>
                  <div
                    className="m3-card-elevated"
                    style={{ padding: "18px", cursor: "pointer" }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15, color: "var(--md-on-surface)", marginBottom: 2 }}>
                          {group.title}
                        </p>
                        <p style={{ fontSize: 12, color: "var(--md-on-surface-variant)" }}>
                          {farm?.name}
                        </p>
                      </div>
                      {freeship && (
                        <span
                          className="m3-chip m3-chip-primary"
                          style={{ fontSize: 11, padding: "2px 8px" }}
                        >
                          🚚 Freeship
                        </span>
                      )}
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          height: 6,
                          background: "var(--md-surface-container-highest)",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            height: "100%",
                            background: freeship ? "var(--md-primary)" : "var(--md-secondary)",
                            borderRadius: 3,
                            transition: "width .4s",
                          }}
                        />
                      </div>
                      <p style={{ fontSize: 12, color: "var(--md-on-surface-variant)", marginTop: 4 }}>
                        {group.current_members}/{group.min_members} người tham gia
                      </p>
                    </div>

                    <p style={{ fontSize: 11, color: "var(--md-on-surface-variant)" }}>
                      📅 Hết hạn:{" "}
                      {new Date(group.deadline).toLocaleDateString("vi-VN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
