"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function AdminLoginForm({ next, configured }: { next?: string; configured: boolean }) {
  const [user, setUser] = useState("admin");
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
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 16 }}>
      <form onSubmit={submit} className="anim-in-scale" style={{ width: "100%", maxWidth: 400, background: "var(--md-surface-container-low)", borderRadius: "var(--shape-xl-inc)", padding: "32px 28px", boxShadow: "var(--elev-2)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ textAlign: "center" }}>
          <span className="m3-brand-mark" style={{ width: 64, height: 64, borderRadius: "var(--shape-lg-inc)", margin: "0 auto 12px", display: "inline-flex", background: "var(--md-tertiary)", color: "var(--md-on-tertiary)" }}><Icon name="admin_panel_settings" size={36} filled /></span>
          <h1 className="headline-sm text-on-surface">Quản trị nền tảng</h1>
          <p className="body-sm text-on-surface-variant">Xanh Tận Tay · dành cho người vận hành</p>
        </div>
        {!configured && (
          <p className="body-sm" style={{ background: "var(--md-error-container)", color: "var(--md-on-error-container)", borderRadius: "var(--shape-md)", padding: "10px 14px" }}>
            Máy chủ chưa đặt <code>ADMIN_PASSWORD</code>. Thêm biến môi trường rồi deploy lại.
          </p>
        )}
        <div className="m3-field">
          <label className="m3-field-label" htmlFor="au">Tài khoản</label>
          <input id="au" className="m3-input" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" required />
        </div>
        <div className="m3-field">
          <label className="m3-field-label" htmlFor="ap">Mật khẩu</label>
          <div style={{ position: "relative" }}>
            <input id="ap" type={show ? "text" : "password"} className="m3-input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required style={{ paddingRight: 48 }} />
            <button type="button" className="m3-icon-btn" onClick={() => setShow((v) => !v)} aria-label="Hiện mật khẩu" style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}><Icon name={show ? "visibility_off" : "visibility"} size={20} /></button>
          </div>
        </div>
        {error && <p className="body-sm anim-in" role="alert" style={{ color: "var(--md-on-error-container)", background: "var(--md-error-container)", borderRadius: "var(--shape-md)", padding: "10px 14px" }}>{error}</p>}
        <button type="submit" className="m3-btn m3-btn-filled m3-btn-lg m3-btn-block" disabled={loading || !configured}>
          {loading ? <span className="m3-loader sm on-primary" /> : <Icon name="login" />}<span>Vào trang quản trị</span>
        </button>
      </form>
    </div>
  );
}
