// Set EXPO_PUBLIC_API_URL in .env.local to your Vercel deployment URL
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://xanhtantay.vercel.app";

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Lỗi ${res.status}`);
  }
  return res.json();
}
