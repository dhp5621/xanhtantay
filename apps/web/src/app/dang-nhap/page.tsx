"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DangNhapPage() {
  const [role, setRole] = useState<"customer" | "farmer">("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      role,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email hoặc mật khẩu không đúng. Thử lại nhé.");
    } else {
      router.push(role === "farmer" ? "/farmer" : "/");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--md-surface)",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--md-surface-container-low)",
          borderRadius: "var(--radius-xl)",
          padding: "36px 32px",
          boxShadow: "0 2px 12px rgba(0,0,0,.1)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontSize: 36, marginBottom: 4 }}>🌿</p>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--md-primary)",
              marginBottom: 4,
            }}
          >
            Xanh Tận Tay
          </h1>
          <p style={{ fontSize: 13, color: "var(--md-on-surface-variant)" }}>
            Nông sản tươi từ vườn đến tay bạn
          </p>
        </div>

        {/* Role toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--md-surface-container-highest)",
            borderRadius: "var(--radius-full)",
            padding: 3,
            marginBottom: 24,
          }}
        >
          {(["customer", "farmer"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "var(--radius-full)",
                border: "none",
                cursor: "pointer",
                fontWeight: role === r ? 600 : 400,
                fontSize: 14,
                background: role === r ? "var(--md-primary)" : "transparent",
                color: role === r ? "var(--md-on-primary)" : "var(--md-on-surface-variant)",
                transition: "background .2s, color .2s",
              }}
            >
              {r === "customer" ? "🛒 Tôi là khách hàng" : "🌾 Tôi là nông dân"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              className="m3-label"
              style={{ display: "block", marginBottom: 6 }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === "farmer" ? "bacba@xanhtantay.vn" : "ban@gmail.com"}
              className="m3-input"
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="m3-label" style={{ display: "block", marginBottom: 6 }}>
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="m3-input"
              required
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: 13,
                color: "var(--md-error)",
                background: "var(--md-error-container)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                marginBottom: 16,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="m3-filled-button"
            style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 15 }}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 12,
            color: "var(--md-on-surface-variant)",
          }}
        >
          Tài khoản demo: <strong>bacba@xanhtantay.vn</strong> / <strong>demo123</strong>
        </p>
      </div>
    </div>
  );
}
