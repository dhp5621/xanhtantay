import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { lt } from "drizzle-orm";
import { db } from "@/db";
import { broadcasts } from "@/db/schema";
import { broadcastPush, type PushTarget } from "@/lib/push";

const TARGETS = new Set<PushTarget>(["mobile", "web", "all"]);

/** Admin broadcast: { title, body, target: "mobile" | "web" | "all", url? }. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { title?: string; body?: string; target?: string; url?: string };
  const title = String(body.title ?? "").trim().slice(0, 120);
  const text = String(body.body ?? "").trim().slice(0, 500);
  const target = body.target as PushTarget;
  if (!title || !text) return NextResponse.json({ error: "Cần nhập tiêu đề và nội dung" }, { status: 400 });
  if (!TARGETS.has(target)) return NextResponse.json({ error: "Đối tượng gửi không hợp lệ" }, { status: 400 });
  const url = body.url?.trim().startsWith("/") ? body.url.trim() : undefined;
  // Stored as well, so browsers and phones without a push service get it on their next poll.
  await db.delete(broadcasts).where(lt(broadcasts.created_at, new Date(Date.now() - 7 * 864e5)));
  await db.insert(broadcasts).values({ title, body: text, url: url ?? null, target });
  return NextResponse.json(await broadcastPush(target, { title, body: text, url }));
}
