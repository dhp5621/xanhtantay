"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";
import { EmptyState } from "@/components/ui/EmptyState";

export interface UserRecipe {
  id: string; title: string; description: string | null; ingredients: string[]; steps: string[];
  based_on: string[]; source: string; minutes: number | null; created_at: Date | string; order_id: string | null;
}

export function RecipeAssistant({ purchased, initial, focusOrderId, ai }: { purchased: string[]; initial: UserRecipe[]; focusOrderId?: string; ai: boolean }) {
  const [recipes, setRecipes] = useState<UserRecipe[]>(initial);
  const [busy, setBusy] = useState<"all" | string | null>(null);
  const [open, setOpen] = useState<string | null>(initial[0]?.id ?? null);
  const { show } = useSnackbar();

  const generate = async (opts: { count?: number; replace_id?: string; order_id?: string }) => {
    setBusy(opts.replace_id ?? "all");
    try {
      const res = await fetch("/api/recipes/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: opts.count ?? 3, replace_id: opts.replace_id, order_id: opts.order_id, exclude: recipes.map((r) => r.title) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Không gợi ý được");
      const fresh: UserRecipe[] = data.recipes;
      setRecipes((rs) => [...fresh, ...rs.filter((r) => r.id !== opts.replace_id)]);
      setOpen(fresh[0]?.id ?? null);
      show(data.source === "ai" ? `Đã nấu ra ${fresh.length} món mới cho bạn` : `Đã tìm ${fresh.length} công thức mẫu phù hợp`, { kind: "success" });
    } catch (e) {
      show(e instanceof Error ? e.message : "Có lỗi xảy ra", { kind: "error", duration: 6000 });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/recipes/mine?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) { setRecipes((rs) => rs.filter((r) => r.id !== id)); show("Đã bỏ món này", { kind: "success", duration: 1500 }); }
    else show("Không xoá được", { kind: "error" });
  };

  const noPurchases = purchased.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* What we know the customer bought */}
      <section className="m3-hero anim-in-scale" style={{ padding: "22px 24px", borderRadius: "var(--shape-xl-inc)" }}>
        <span className="m3-hero-blob" style={{ width: 220, height: 220, right: -60, top: -90 }} />
        <div style={{ position: "relative" }}>
          <p className="label-md" style={{ color: "var(--md-on-primary-container)", opacity: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Rau củ đã giao đến bạn</p>
          {noPurchases ? (
            <p className="body-md" style={{ color: "var(--md-on-primary-container)" }}>Chưa có đơn nào được giao. Đơn đang thu hoạch hay đang trên xe chưa tính; rau về tới cửa là trợ lý gợi ý ngay.</p>
          ) : (
            <div className="flex flex-wrap gap-2 stagger">
              {purchased.map((n) => <span key={n} className="m3-chip round" style={{ background: "var(--md-surface-container-lowest)", boxShadow: "none" }}><Icon name="eco" size={16} filled className="text-primary" /> {n}</span>)}
            </div>
          )}
          <div className="flex flex-wrap gap-2" style={{ marginTop: 16 }}>
            {noPurchases ? (
              <>
                <Link href="/don-hang" className="m3-btn m3-btn-filled"><Icon name="package_2" /><span>Xem đơn đang giao</span></Link>
                <Link href="/farms" className="m3-btn m3-btn-tonal"><Icon name="potted_plant" /><span>Chọn vườn rau</span></Link>
              </>
            ) : (
              <>
                <button className="m3-btn m3-btn-filled m3-btn-lg" onClick={() => generate({ count: 3, order_id: focusOrderId })} disabled={busy !== null}>
                  {busy === "all" ? <span className="m3-loader sm on-primary" /> : <Icon name="auto_awesome" filled />}
                  <span>{busy === "all" ? "Đang nghĩ món…" : recipes.length ? "Gợi ý thêm 3 món" : "Gợi ý món cho tôi"}</span>
                </button>
                {focusOrderId && <span className="m3-chip sm round m3-chip-tertiary"><Icon name="receipt_long" size={16} /> Theo đơn đã giao này</span>}
              </>
            )}
          </div>
          <p className="body-sm" style={{ color: "var(--md-on-secondary-container)", marginTop: 10, opacity: 0.85 }}>
            {ai ? "Chỉ tính rau đã giao tới tay bạn. Mỗi lần bấm là một thực đơn mới, không lặp lại món đã có; mọi gợi ý được lưu vào lịch sử." : "Chỉ tính rau đã giao tới tay bạn. Máy chủ chưa bật AI, đang dùng công thức mẫu."}
          </p>
        </div>
      </section>

      {recipes.length === 0 ? (
        !noPurchases && <EmptyState icon="restaurant" title="Chưa có công thức nào" description="Bấm “Gợi ý món cho tôi” để trợ lý nấu từ giỏ rau của bạn." />
      ) : (
        <section>
          <div className="m3-section-head">
            <h2 className="headline-sm text-on-surface"><Icon name="menu_book" filled /> Thực đơn của bạn</h2>
            <span className="body-sm text-on-surface-variant">{recipes.length} món đã lưu</span>
          </div>
          <div className="m3-list-group stagger">
            {recipes.map((r) => {
              const expanded = open === r.id;
              const replacing = busy === r.id;
              return (
                <article key={r.id} className="m3-list-item" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: 0, padding: 0 }}>
                  <button type="button" onClick={() => setOpen(expanded ? null : r.id)} aria-expanded={expanded} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", width: "100%", color: "inherit", font: "inherit" }}>
                    <span className="m3-list-leading" style={{ background: r.source === "ai" ? "var(--md-tertiary-container)" : undefined, color: r.source === "ai" ? "var(--md-on-tertiary-container)" : undefined }}>
                      <Icon name={r.source === "ai" ? "auto_awesome" : "restaurant"} filled />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="title-md text-on-surface" style={{ display: "block" }}>{r.title}</span>
                      <span className="body-sm text-on-surface-variant" style={{ display: "block", fontWeight: 400 }}>
                        {r.minutes ? `${r.minutes} phút · ` : ""}{r.based_on.length ? `từ ${r.based_on.join(", ")}` : `${r.ingredients.length} nguyên liệu`}
                      </span>
                    </span>
                    <Icon name={expanded ? "expand_less" : "expand_more"} className="text-on-surface-variant" />
                  </button>

                  {expanded && (
                    <div className="anim-in" style={{ padding: "0 18px 18px 18px" }}>
                      {r.description && <p className="body-md text-on-surface-variant" style={{ marginBottom: 12, fontWeight: 400 }}>{r.description}</p>}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                        <div className="md:col-span-2">
                          <p className="label-md text-on-surface-variant" style={{ marginBottom: 8, textTransform: "uppercase" }}>Nguyên liệu</p>
                          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                            {r.ingredients.map((ing, i) => {
                              const bought = r.based_on.some((b) => ing.toLowerCase().includes(b.toLowerCase()));
                              return (
                                <li key={i} className="body-md" style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 400 }}>
                                  <Icon name={bought ? "eco" : "circle"} size={bought ? 18 : 8} filled className={bought ? "text-primary" : "text-on-surface-variant"} style={bought ? undefined : { marginTop: 7 }} />
                                  <span>{ing}{bought && <span className="body-sm text-primary" style={{ marginLeft: 6 }}>đã mua</span>}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                        <div className="md:col-span-3">
                          <p className="label-md text-on-surface-variant" style={{ marginBottom: 8, textTransform: "uppercase" }}>Cách làm</p>
                          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                            {r.steps.map((s, i) => (
                              <li key={i} className="body-md text-on-surface" style={{ display: "flex", gap: 10, lineHeight: 1.55, fontWeight: 400 }}>
                                <span className="m3-step-dot done" style={{ width: 26, height: 26, fontSize: 12, flexShrink: 0 }}>{i + 1}</span><span>{s}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2" style={{ marginTop: 16 }}>
                        <button className="m3-btn m3-btn-tonal-primary" onClick={() => generate({ count: 1, replace_id: r.id })} disabled={busy !== null}>
                          {replacing ? <span className="m3-loader sm" /> : <Icon name="swap_horiz" />}<span>{replacing ? "Đang đổi…" : "Đổi món khác"}</span>
                        </button>
                        <button className="m3-btn m3-btn-text" onClick={() => remove(r.id)} disabled={busy !== null} style={{ color: "var(--md-error)" }}><Icon name="delete" size={20} /><span>Bỏ món này</span></button>
                        <span className="body-sm text-on-surface-variant" style={{ marginLeft: "auto", alignSelf: "center" }}>{r.source === "ai" ? "AI gợi ý" : "Công thức mẫu"} · {new Date(r.created_at).toLocaleDateString("vi-VN", { day: "numeric", month: "short", timeZone: "Asia/Ho_Chi_Minh" })}</span>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
