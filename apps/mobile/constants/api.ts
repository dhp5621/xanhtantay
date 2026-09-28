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

/**
 * fetch() has no timeout option and iOS gives up on a silent request after 60 seconds, so a call
 * that may take that long goes through XMLHttpRequest, which passes its timeout to the native layer.
 */
function requestWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Pick<Response, "ok" | "status" | "json">> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method ?? "GET", url);
    xhr.withCredentials = true;
    xhr.timeout = timeoutMs;
    Object.entries((options.headers ?? {}) as Record<string, string>).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.onload = () => {
      const text = xhr.responseText;
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, json: async () => JSON.parse(text) });
    };
    xhr.onerror = () => reject(new TypeError("Network request failed"));
    xhr.ontimeout = () => reject(new ApiError("Máy chủ trả lời quá lâu, xin thử lại giúp ạ", 408));
    xhr.send(typeof options.body === "string" ? options.body : null);
  });
}

/**
 * All requests carry credentials so the native cookie jar attaches the NextAuth session cookie.
 * `timeoutMs` is only for calls known to be slow (the AI menu); everything else keeps plain fetch.
 */
export async function apiFetch(path: string, options?: RequestInit & { timeoutMs?: number }) {
  await ensureCookieRestored();
  const { timeoutMs, ...init } = options ?? {};
  const headers = { "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) };
  const res = timeoutMs ? await requestWithTimeout(`${API_URL}/api${path}`, { ...init, headers }, timeoutMs) : await fetch(`${API_URL}/api${path}`, { ...init, credentials: "include", headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error ?? `Lỗi ${res.status}`, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Multipart upload. No Content-Type header: the native layer writes the boundary itself.
 * Goes through XMLHttpRequest because fetch() cannot report how much has been sent; `onProgress`
 * gets the sent fraction from 0 to 1.
 */
export async function apiUpload(path: string, form: FormData, opts?: { onProgress?: (fraction: number) => void; timeoutMs?: number }) {
  await ensureCookieRestored();
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api${path}`);
    xhr.withCredentials = true;
    xhr.timeout = opts?.timeoutMs ?? 180_000;
    if (opts?.onProgress) {
      const report = opts.onProgress;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) report(Math.min(1, e.loaded / e.total));
      };
    }
    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // not JSON (e.g. a gateway's "payload too large" page)
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data?.error ?? (xhr.status === 413 ? "Tệp lớn quá nên máy chủ không nhận ạ" : `Lỗi ${xhr.status}`), xhr.status));
    };
    xhr.onerror = () => reject(new TypeError("Network request failed"));
    xhr.ontimeout = () => reject(new ApiError("Mạng đang yếu nên tải lên quá lâu, xin thử lại giúp ạ", 408));
    xhr.send(form);
  });
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
