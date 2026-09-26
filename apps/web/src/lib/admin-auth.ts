/**
 * Platform-manager auth, independent of next-auth. Login = ADMIN_USER (default "admin")
 * + ADMIN_PASSWORD from the server environment. Session = HMAC-signed cookie (WebCrypto,
 * so it verifies in Edge middleware too).
 */
export const ADMIN_COOKIE = "xtt_admin";
const TTL_SECONDS = 12 * 60 * 60;

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function key(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export function adminSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
}

export function adminCredentialsConfigured() {
  return !!process.env.ADMIN_PASSWORD && !!adminSecret();
}

export function checkAdminCredentials(user: string, password: string) {
  const expectedUser = process.env.ADMIN_USER ?? "admin";
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // constant-time-ish compare
  const a = enc.encode(password), b = enc.encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return user.trim().toLowerCase() === expectedUser.toLowerCase() && diff === 0;
}

export async function signAdminToken(secret: string) {
  const payload = b64(enc.encode(JSON.stringify({ sub: "admin", exp: Math.floor(Date.now() / 1000) + TTL_SECONDS })));
  const sig = b64(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(payload)));
  return `${payload}.${sig}`;
}

export async function verifyAdminToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token || !secret) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(secret), unb64(sig), enc.encode(payload));
    if (!ok) return false;
    const data = JSON.parse(new TextDecoder().decode(unb64(payload)));
    return data.sub === "admin" && typeof data.exp === "number" && data.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export const ADMIN_TTL = TTL_SECONDS;
