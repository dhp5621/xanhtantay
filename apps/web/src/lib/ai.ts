/** Minimal OpenAI-compatible chat helper for the self-hosted chat API. */
const URL_ = process.env.CHAT_API_URL ?? "https://chat-api.chuyenbienhoa.com/v1/chat/completions";
const MODEL = process.env.CHAT_API_MODEL ?? "gemini-flash-lite";

export const aiConfigured = () => !!process.env.CHAT_API_SECRET;

export async function chatJSON<T>(system: string, user: string, opts?: { temperature?: number; timeoutMs?: number }): Promise<T | null> {
  const key = process.env.CHAT_API_SECRET;
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 25_000);
  try {
    const res = await fetch(URL_, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, temperature: opts?.temperature ?? 0.7, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const m = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
