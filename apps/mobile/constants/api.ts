// Set EXPO_PUBLIC_API_URL in .env.local to your Vercel deployment URL
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://xanhtantay.vercel.app";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** All requests carry credentials so RN's native cookie jar keeps the NextAuth session cookie. */
export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error ?? `Lỗi ${res.status}`, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Mirrors the NextAuth Credentials sign-in flow (CSRF token, then callback) used by the web login form. */
export async function login(email: string, password: string) {
  const csrfRes = await fetch(`${API_URL}/api/auth/csrf`, { credentials: "include" });
  const { csrfToken } = await csrfRes.json();

  const body = new URLSearchParams({
    email,
    password,
    csrfToken,
    callbackUrl: `${API_URL}/`,
    json: "true",
  });

  const res = await fetch(`${API_URL}/api/auth/callback/credentials`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new ApiError("Đăng nhập thất bại", res.status);
  const data = await res.json().catch(() => null);
  if (data?.url && /error=/.test(data.url)) throw new ApiError("Email hoặc mật khẩu không đúng", 401);

  return getSession();
}

export async function logout() {
  const csrfRes = await fetch(`${API_URL}/api/auth/csrf`, { credentials: "include" });
  const { csrfToken } = await csrfRes.json();
  await fetch(`${API_URL}/api/auth/signout`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, json: "true" }).toString(),
  });
}

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: "customer" | "farmer";
  farmSlug?: string | null;
  image?: string | null;
};

export async function getSession(): Promise<SessionUser | null> {
  const res = await fetch(`${API_URL}/api/auth/session`, { credentials: "include" });
  const data = await res.json().catch(() => null);
  return data?.user ?? null;
}
