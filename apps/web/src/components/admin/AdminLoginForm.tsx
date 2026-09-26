"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function AdminLoginForm({ next, configured }: { next?: string; configured: boolean }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user, password }) });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(data?.error ?? "Đăng nhập thất bại"); return; }
    router.push(next?.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "24px 16px", position: "relative", overflow: "hidden", margin: "-24px -16px -48px", width: "calc(100% + 32px)" }}>
      <span className="m3-hero-blob" style={{ width: 380, height: 380, top: -140, left: -140, opacity: 0.5, background: "color-mix(in srgb, var(--md-tertiary) 16%, transparent)" }} />
      <span className="m3-hero-blob" style={{ width: 300, height: 300, bottom: -120, right: -100, opacity: 0.5, animationDelay: "-4s" }} />
      <form onSubmit={submit} className="anim-in-scale" style={{ position: "relative", width: "100%", maxWidth: 440, background: "var(--md-surface-container-low)", borderRadius: "var(--shape-xl-inc)", padding: "36px 32px 28px", boxShadow: "var(--elev-3)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <span className="m3-brand-mark" style={{ width: 72, height: 72, borderRadius: "var(--shape-xl)", margin: "0 auto 14px", display: "inline-flex", background: "linear-gradient(135deg, var(--md-tertiary), var(--md-primary))", color: "var(--md-on-tertiary)", boxShadow: "var(--elev-2)" }}><Icon name="admin_panel_settings" size={40} filled /></span>
          <p className="m3-eyebrow" style={{ color: "var(--md-tertiary)", marginBottom: 4 }}>Xanh Tận Tay</p>
          <h1 className="headline-md text-on-surface">Quản trị nền tảng</h1>
          <p className="body-md text-on-surface-variant" style={{ marginTop: 4 }}>Dành cho người vận hành. Tài khoản và mật khẩu do máy chủ cấp.</p>
        </div>
        {!configured && (
          <p className="body-sm" style={{ background: "var(--md-error-container)", color: "var(--md-on-error-container)", borderRadius: "var(--shape-md)", padding: "10px 14px" }}>
            Máy chủ chưa đặt <code>ADMIN_PASSWORD</code>. Thêm biến môi trường rồi deploy lại.
          </p>
        )}
        <div className="m3-field">
          <label className="m3-field-label" htmlFor="au">Tài khoản</label>
          <div style={{ position: "relative" }}>
            <Icon name="person" size={20} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--md-on-surface-variant)" }} />
            <input id="au" className="m3-input" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" placeholder="Tên đăng nhập quản trị" required style={{ paddingLeft: 44 }} />
          </div>
        </div>
        <div className="m3-field">
          <label className="m3-field-label" htmlFor="ap">Mật khẩu</label>
          <div style={{ position: "relative" }}>
            <Icon name="key" size={20} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--md-on-surface-variant)" }} />
            <input id="ap" type={show ? "text" : "password"} className="m3-input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" required style={{ paddingLeft: 44, paddingRight: 48 }} />
            <button type="button" className="m3-icon-btn" onClick={() => setShow((v) => !v)} aria-label="Hiện mật khẩu" style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}><Icon name={show ? "visibility_off" : "visibility"} size={20} /></button>
          </div>
        </div>
        {error && <p className="body-sm anim-in" role="alert" style={{ color: "var(--md-on-error-container)", background: "var(--md-error-container)", borderRadius: "var(--shape-md)", padding: "10px 14px" }}>{error}</p>}
        <button type="submit" className="m3-btn m3-btn-filled m3-btn-lg m3-btn-block" disabled={loading || !configured} style={{ marginTop: 4 }}>
          {loading ? <span className="m3-loader sm on-primary" /> : <Icon name="login" />}<span>Vào trang quản trị</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <a href="/" className="m3-btn m3-btn-text m3-btn-sm" style={{ marginLeft: -12 }}><Icon name="arrow_back" size={18} /><span>Về cửa hàng</span></a>
          <span className="body-sm text-on-surface-variant" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="lock" size={14} /> Phiên hết hạn sau 12 giờ</span>
        </div>
      </form>
    </div>
  );
}
