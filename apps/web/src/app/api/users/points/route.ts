import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getLoyalty } from "@/lib/loyalty";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const l = await getLoyalty(user.id);
  return NextResponse.json({ points: l.points, pendingPoints: l.pendingPoints, level: l.level.name, trees: l.trees });
}
