import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { storageUsage, sweepStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** How full the file store is. */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  try { return NextResponse.json(await storageUsage()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Không đọc được kho lưu trữ" }, { status: 502 }); }
}

/** Runs the clean-up now instead of waiting for the daily one. */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 });
  try { return NextResponse.json(await sweepStorage()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Không dọn được kho lưu trữ" }, { status: 502 }); }
}
