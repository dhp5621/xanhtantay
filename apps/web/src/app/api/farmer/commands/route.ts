import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getCommandsForFarmer } from "@/lib/queries";

/** The farmer's harvest commands, newest first. `current` is the one that still needs attention. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const { farm, commands } = await getCommandsForFarmer(user.id);
  const current = commands.find((c) => c.status === "sent") ?? commands.find((c) => c.run_status === "allocated" || c.run_status === "harvesting") ?? null;
  return NextResponse.json({ farm: farm ? { id: farm.id, name: farm.name, location: farm.location } : null, current, commands });
}
