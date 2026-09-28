import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// @react-native-cookies/cookies throws at import time on any platform other than iOS/Android
// (e.g. `expo start --web`), so it's only safe to require on native platforms.
const CookieManager = Platform.OS === "ios" || Platform.OS === "android" ? require("@react-native-cookies/cookies").default : null;

// Set EXPO_PUBLIC_API_URL in .env.local to your Vercel deployment URL
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://xanhtantay.vercel.app";

const SESSION_COOKIE_KEY = "xtt_session_cookie";
// NextAuth prefixes the cookie with __Secure- whenever the site itself is served over https —
// that depends on the API origin, not on whether this bundle is a dev or release build.
const IS_SECURE_API = API_URL.startsWith("https://");
const SESSION_COOKIE_NAME = IS_SECURE_API ? "__Secure-next-auth.session-token" : "next-auth.session-token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * React Native's fetch/XHR layer talks to the native networking stack (OkHttp on Android,
 * NSURLSession on iOS), which does not expose Set-Cookie response headers to JS and can also
 * merge multiple Set-Cookie headers into one comma-joined string, breaking cookie parsing.
 * `credentials: "include"` alone is not reliable for keeping a NextAuth session across requests
 * or app restarts, so we manage the session cookie explicitly with @react-native-cookies/cookies
 * (native cookie jar, works with fetch since it reads the same jar) and mirror its value into
 * expo-secure-store so the session survives an app restart even if the native jar is cleared.
 */
async function restoreCookieFromSecureStore() {
  try {
    const saved = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
    if (!saved) return;
    await CookieManager?.set(API_URL, {
      name: SESSION_COOKIE_NAME,
      value: saved,
      path: "/",
      secure: IS_SECURE_API,
      httpOnly: true,
    });
  } catch {
    // best-effort; if this fails we just fall back to no session
  }
}

async function persistSessionCookie() {
  try {
    const cookies = await CookieManager?.get(API_URL);
    const sessionCookie = cookies?.[SESSION_COOKIE_NAME];
    if (sessionCookie?.value) {
      await SecureStore.setItemAsync(SESSION_COOKIE_KEY, sessionCookie.value);
    }
  } catch {
    // best-effort
  }
}

async function clearSessionCookie() {
  try {
    await SecureStore.deleteItemAsync(SESSION_COOKIE_KEY);
    await CookieManager?.clearAll();
  } catch {
    // best-effort
  }
}

let cookieRestorePromise: Promise<void> | null = null;
function ensureCookieRestored() {
  if (!cookieRestorePromise) cookieRestorePromise = restoreCookieFromSecureStore();
  return cookieRestorePromise;
}

/** All requests carry credentials so the native cookie jar attaches the NextAuth session cookie. */
export async function apiFetch(path: string, options?: RequestInit) {
  await ensureCookieRestored();
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
  await ensureCookieRestored();
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
    // Follow NextAuth's redirect manually isn't needed: fetch follows redirects by default and
    // carries credentials/cookies along the chain, but we still read the final JSON body below.
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new ApiError("Đăng nhập thất bại", res.status);
  const data = await res.json().catch(() => null);
  if (data?.url && /error=/.test(data.url)) throw new ApiError("Email hoặc mật khẩu không đúng", 401);

  const session = await getSession();
  if (!session) throw new ApiError("Đăng nhập thất bại, vui lòng thử lại", 401);
  await persistSessionCookie();
  return session;
}

export async function logout() {
  await ensureCookieRestored();
  const csrfRes = await fetch(`${API_URL}/api/auth/csrf`, { credentials: "include" });
  const { csrfToken } = await csrfRes.json();
  await fetch(`${API_URL}/api/auth/signout`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, json: "true" }).toString(),
  });
  await clearSessionCookie();
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
  await ensureCookieRestored();
  const res = await fetch(`${API_URL}/api/auth/session`, { credentials: "include" });
  const data = await res.json().catch(() => null);
  const user = data?.user ?? null;
  if (user) await persistSessionCookie();
  return user;
}
