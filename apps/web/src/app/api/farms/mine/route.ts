import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { farms, type FarmChange } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getFarms } from "@/lib/queries";
import { fileRequest, requestState, withdrawRequest } from "@/lib/requests";

async function mine() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
  if (user.role !== "farmer") return { error: NextResponse.json({ error: "Không có quyền" }, { status: 403 }) };
  const [row] = await db.select().from(farms).where(eq(farms.owner_id, user.id));
  if (!row) return { error: NextResponse.json({ error: "Bạn chưa có vườn" }, { status: 404 }) };
  return { farm: row };
}
const view = async (farmId: string) => ({ ...(await getFarms(farmId))[0], ...(await requestState(farmId, "farm")) });

/** The farm, plus `pending` (a change waiting for the operator) and `rejected` (why the last one was turned down). */
export async function GET() {
  const m = await mine();
  return m.error ?? NextResponse.json(await view(m.farm.id));
}

/**
 * PATCH { name?, location?, province?, description? }: asks to change how the farm is presented.
 * Nothing changes until the operator approves it in /admin. The page address (slug) never changes.
 */
export async function PATCH(req: Request) {
  const m = await mine();
  if (m.error) return m.error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const change: FarmChange = {};
  const field = (key: "name" | "location" | "province", label: string, max: number) => {
    if (typeof body[key] !== "string") return null;
    const v = (body[key] as string).replace(/\s+/g, " ").trim().slice(0, max);
    if (v.length < 2) return `${label} cần ít nhất 2 ký tự`;
    if (v !== m.farm[key]) change[key] = v;
    return null;
  };
  const problem = field("name", "Tên vườn", 80) ?? field("location", "Địa chỉ vườn", 120) ?? field("province", "Tỉnh", 40);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (typeof body.description === "string") {
    const d = body.description.trim().slice(0, 1200) || null;
    if (d !== (m.farm.description ?? null)) change.description = d;
  }
  if (!Object.keys(change).length) return NextResponse.json({ error: "Không có gì thay đổi so với thông tin hiện tại" }, { status: 400 });
  await fileRequest(m.farm.id, "farm", change);
  return NextResponse.json(await view(m.farm.id), { status: 202 });
}

/** Withdraws the change that is still waiting for approval. */
export async function DELETE() {
  const m = await mine();
  if (m.error) return m.error;
  await withdrawRequest(m.farm.id, "farm");
  return NextResponse.json(await view(m.farm.id));
}
