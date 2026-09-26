import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_TTL, adminCredentialsConfigured, adminSecret, checkAdminCredentials, signAdminToken } from "@/lib/admin-auth";

const attempts = new Map<string, { n: number; t: number }>();

export async function POST(req: Request) {
  if (!adminCredentialsConfigured()) {
    return NextResponse.json({ error: "Chưa cấu hình ADMIN_PASSWORD trên máy chủ" }, { status: 503 });
  }
  // Tiny in-memory throttle per IP (per serverless instance): 8 tries / 10 min.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const a = attempts.get(ip) ?? { n: 0, t: Date.now() };
  if (Date.now() - a.t > 10 * 60_000) { a.n = 0; a.t = Date.now(); }
  if (a.n >= 8) return NextResponse.json({ error: "Thử quá nhiều lần, đợi 10 phút" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const { user = "", password = "" } = body as { user?: string; password?: string };
  if (!checkAdminCredentials(String(user), String(password))) {
    a.n++; attempts.set(ip, a);
    return NextResponse.json({ error: "Sai tài khoản hoặc mật khẩu quản trị" }, { status: 401 });
  }
  attempts.delete(ip);

  const token = await signAdminToken(adminSecret());
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: ADMIN_TTL });
  return res;
}
