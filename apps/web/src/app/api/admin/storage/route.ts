import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { cleanupPlan, databaseUsage, runCleanup, type CleanupKey } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const KEYS: CleanupKey[] = ["orphans", "evidence", "requests", "broadcasts"];

/** How full the database and the file store are, and what a clean-up would remove. Changes nothing. */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  try {
    const [database, plan] = await Promise.all([databaseUsage(), cleanupPlan()]);
    return NextResponse.json({ database, ...plan });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Không đọc được dung lượng" }, { status: 502 }); }
}

/** POST { keys: CleanupKey[], confirm: "XOA" } removes the chosen kinds of leftover data for good. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { keys?: unknown; confirm?: unknown };
  const keys = Array.isArray(body.keys) ? KEYS.filter((k) => (body.keys as unknown[]).includes(k)) : [];
  if (!keys.length) return NextResponse.json({ error: "Chưa chọn mục nào để xoá" }, { status: 400 });
  if (body.confirm !== "XOA") return NextResponse.json({ error: "Cần xác nhận trước khi xoá" }, { status: 400 });
  try {
    const removed = await runCleanup(keys);
    const [database, plan] = await Promise.all([databaseUsage(), cleanupPlan()]);
    return NextResponse.json({ removed, database, ...plan });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Không xoá được" }, { status: 502 }); }
}
