/** Minimal OpenAI-compatible chat helper for the self-hosted chat API (gemini-web2api). */
const URL_ = process.env.CHAT_API_URL ?? "https://chat-api.chuyenbienhoa.com/v1/chat/completions";
const MODEL = process.env.CHAT_API_MODEL ?? "gemini-flash-lite";
/**
 * Model for answers that must come from the live web. Every gemini-web2api model has Gemini's
 * native search; this one is the all-round model with the longer output that recipes need.
 */
export const SEARCH_MODEL = process.env.CHAT_SEARCH_MODEL ?? "gemini-3.6-flash";

export const aiConfigured = () => !!process.env.CHAT_API_SECRET;

export async function chatJSON<T>(system: string, user: string, opts?: { temperature?: number; timeoutMs?: number; model?: string }): Promise<T | null> {
  const key = process.env.CHAT_API_SECRET;
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 25_000);
  try {
    const res = await fetch(URL_, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: opts?.model ?? MODEL, temperature: opts?.temperature ?? 0.7, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
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

/** Web-search model first; if the gateway does not know it, the default model (which also searches). */
export async function searchJSON<T>(system: string, user: string, opts?: { temperature?: number; timeoutMs?: number }): Promise<T | null> {
  const started = Date.now();
  const first = await chatJSON<T>(system, user, { ...opts, model: SEARCH_MODEL });
  if (first || SEARCH_MODEL === MODEL) return first;
  // Only retry when the first attempt failed fast (unknown model), not when it used up the time budget.
  if (Date.now() - started > 8_000) return null;
  return chatJSON<T>(system, user, opts);
}
