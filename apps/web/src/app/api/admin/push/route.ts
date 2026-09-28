import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { desc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { broadcasts, farms, harvest_commands, users } from "@/db/schema";
import { COMMAND_CATEGORY } from "@/lib/commands";
import { PUSH_TEMPLATES } from "@/lib/push-templates";
import { broadcastPush, type PushTarget } from "@/lib/push";

const TARGETS = new Set<PushTarget>(["mobile", "web", "all"]);

/** The demo farmer's latest command, put back to "sent" so Có / Không can be tried again. */
async function commandForTest() {
  const [row] = await db.select({ c: harvest_commands }).from(harvest_commands).innerJoin(farms, eq(harvest_commands.farm_id, farms.id)).innerJoin(users, eq(farms.owner_id, users.id)).where(eq(users.email, "bacba@xanhtantay.vn")).orderBy(desc(harvest_commands.created_at)).limit(1);
  const [any] = row ? [row] : await db.select({ c: harvest_commands }).from(harvest_commands).orderBy(desc(harvest_commands.created_at)).limit(1);
  if (!any) return null;
  await db.update(harvest_commands).set({ status: "sent", confirmed_at: null, declined_at: null }).where(eq(harvest_commands.id, any.c.id));
  return any.c;
}

/** Admin broadcast: { title, body, target: "mobile" | "web" | "all", url? } or { template, target } for a test message. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { title?: string; body?: string; target?: string; url?: string; template?: string };
  const target = body.target as PushTarget;
  const template = body.template ? PUSH_TEMPLATES.find((t) => t.key === body.template) : null;
  if (body.template) {
    if (!template) return NextResponse.json({ error: "Mẫu thông báo không tồn tại" }, { status: 400 });
    if (!TARGETS.has(target)) return NextResponse.json({ error: "Đối tượng gửi không hợp lệ" }, { status: 400 });
    let msg = { title: `[Thử] ${template.title}`, body: template.body, url: template.url } as { title: string; body: string; url: string; category?: string; data?: Record<string, string> };
    if (template.key === "harvest_command") {
      const command = await commandForTest();
      if (!command) return NextResponse.json({ error: "Chưa có lệnh thu hoạch nào để thử. Hãy chốt sổ trước." }, { status: 400 });
      msg = { ...msg, body: command.message, category: COMMAND_CATEGORY, data: { commandId: command.id } };
    }
    await db.insert(broadcasts).values({ title: msg.title, body: msg.body, url: msg.url, target, category: msg.category ?? null, data: msg.data ?? null });
    return NextResponse.json({ ...(await broadcastPush(target, msg)), sentTitle: msg.title });
  }
  const title = String(body.title ?? "").trim().slice(0, 120);
  const text = String(body.body ?? "").trim().slice(0, 500);
  if (!title || !text) return NextResponse.json({ error: "Cần nhập tiêu đề và nội dung" }, { status: 400 });
  if (!TARGETS.has(target)) return NextResponse.json({ error: "Đối tượng gửi không hợp lệ" }, { status: 400 });
  const url = body.url?.trim().startsWith("/") ? body.url.trim() : undefined;
  // Stored as well, so browsers and phones without a push service get it on their next poll.
  await db.delete(broadcasts).where(lt(broadcasts.created_at, new Date(Date.now() - 7 * 864e5)));
  await db.insert(broadcasts).values({ title, body: text, url: url ?? null, target });
  return NextResponse.json(await broadcastPush(target, { title, body: text, url }));
}
