"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const DEMO = {
  customer: { email: "lan@gmail.com", label: "Khách hàng demo", who: "Chị Lan", icon: "shopping_basket", blurb: "Đặt rau, gom đơn, theo dõi đơn hàng" },
  farmer: { email: "bacba@xanhtantay.vn", label: "Nông dân demo", who: "Bác Ba", icon: "agriculture", blurb: "Quản lý đơn, sản phẩm, đăng nhật ký" },
} as const;
type Role = "customer" | "farmer";

export function LoginForm({ next, demoPassword }: { next?: string; demoPassword: string }) {
  const DEMO_PASSWORD = demoPassword;
  const [role, setRole] = useState<Role>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<false | "form" | Role>(false);
  const router = useRouter();

  async function doSignIn(e: string, p: string, r: Role, source: "form" | Role) {
    setLoading(source);
    setError("");
    const res = await signIn("credentials", { email: e, password: p, redirect: false });
    if (res?.error) {
      setError("Email hoặc mật khẩu không đúng. Thử lại nhé.");
      setLoading(false);
      return;
    }
    const dest = next?.startsWith("/") ? next : r === "farmer" ? "/farmer" : "/";
    router.push(dest);
    router.refresh(); // server components (header session, orders) must re-render with the new cookie
  }

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "24px 16px", position: "relative", overflow: "hidden" }}>
      <span className="m3-hero-blob" style={{ width: 360, height: 360, top: -120, left: -120, opacity: 0.6 }} />
      <span className="m3-hero-blob" style={{ width: 280, height: 280, bottom: -100, right: -80, opacity: 0.5, animationDelay: "-4s", background: "color-mix(in srgb, var(--md-tertiary) 14%, transparent)" }} />

      <div className="anim-in-scale" style={{ width: "100%", maxWidth: 440, background: "var(--md-surface-container-low)", borderRadius: "var(--shape-xl-inc)", padding: "36px 28px 28px", boxShadow: "var(--elev-2)", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span className="m3-brand-mark" style={{ width: 64, height: 64, borderRadius: "var(--shape-lg-inc)", margin: "0 auto 12px", display: "inline-flex" }}>
            <Icon name="eco" size={36} filled />
          </span>
          <h1 className="headline-md text-primary">Xanh Tận Tay</h1>
          <p className="body-md text-on-surface-variant">Nông sản tươi từ vườn đến tay bạn</p>
        </div>

        {/* Demo accounts — one tap */}
        <p className="m3-label" style={{ marginBottom: 8 }}>Dùng thử ngay</p>
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
          {(Object.keys(DEMO) as Role[]).map((r) => {
            const d = DEMO[r];
            const busy = loading === r;
            return (
              <button
                key={r}
                type="button"
                disabled={!!loading}
                onClick={() => doSignIn(d.email, DEMO_PASSWORD, r, r)}
                className="m3-card-elevated m3-card-action"
                style={{ padding: "14px 14px 12px", textAlign: "left", border: "none", background: r === "customer" ? "var(--md-primary-container)" : "var(--md-tertiary-container)", color: r === "customer" ? "var(--md-on-primary-container)" : "var(--md-on-tertiary-container)", borderRadius: "var(--shape-lg-inc)" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Icon name={d.icon} size={28} filled />
                  {busy ? <span className="m3-loader sm" style={{ background: "currentColor" }} /> : <Icon name="arrow_forward" size={20} />}
                </div>
                <p className="title-sm">{d.label}</p>
                <p className="body-sm" style={{ opacity: 0.8 }}>{d.who} · {d.blurb}</p>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <hr className="m3-divider" style={{ flex: 1 }} />
          <span className="body-sm text-on-surface-variant">hoặc đăng nhập bằng email</span>
          <hr className="m3-divider" style={{ flex: 1 }} />
        </div>

        <div className="m3-button-group" style={{ width: "100%", marginBottom: 20 }}>
          {(["customer", "farmer"] as const).map((r) => (
            <button key={r} type="button" className={`m3-seg ${role === r ? "selected" : ""}`} onClick={() => setRole(r)}>
              <Icon name={r === "customer" ? "shopping_basket" : "agriculture"} size={18} />
              {r === "customer" ? "Khách hàng" : "Nông dân"}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); doSignIn(email, password, role, "form"); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="m3-field">
            <label className="m3-field-label" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={DEMO[role].email} className="m3-input" required />
          </div>
          <div className="m3-field">
            <label className="m3-field-label" htmlFor="password">Mật khẩu</label>
            <div style={{ position: "relative" }}>
              <input id="password" type={showPw ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="m3-input" style={{ paddingRight: 48 }} required />
              <button type="button" className="m3-icon-btn" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"} style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}>
                <Icon name={showPw ? "visibility_off" : "visibility"} size={20} />
              </button>
            </div>
          </div>

          {error && (
            <p className="anim-in body-sm" role="alert" style={{ color: "var(--md-on-error-container)", background: "var(--md-error-container)", borderRadius: "var(--shape-md)", padding: "10px 14px", display: "flex", gap: 8, alignItems: "center" }}>
              <Icon name="error" size={18} filled /> {error}
            </p>
          )}

          <button type="submit" disabled={!!loading} className="m3-btn m3-btn-filled m3-btn-lg m3-btn-block" style={{ marginTop: 4 }}>
            {loading === "form" ? <span className="m3-loader sm on-primary" /> : <Icon name="login" />}
            <span>{loading === "form" ? "Đang đăng nhập…" : "Đăng nhập"}</span>
          </button>
        </form>

        <p className="body-sm text-on-surface-variant" style={{ textAlign: "center", marginTop: 18 }}>
          Mật khẩu mọi tài khoản demo: <strong>{DEMO_PASSWORD}</strong>
        </p>
      </div>
    </div>
  );
}
