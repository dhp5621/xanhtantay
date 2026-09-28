import { NextResponse } from "next/server";
import { getGroups, getGroupMembers } from "@/lib/queries";
import { getSessionUser } from "@/lib/session";
import { isPastCutoff, cutoffInstant } from "@/lib/commerce";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [group] = await getGroups({ id });
  if (!group) return NextResponse.json({ error: "Không tìm thấy nhóm" }, { status: 404 });
  const [members, user] = await Promise.all([getGroupMembers(id), getSessionUser()]);
  return NextResponse.json({
    ...group,
    cutoff_at: cutoffInstant(group.delivery_date).toISOString(),
    closed: group.status !== "open" || isPastCutoff(group.delivery_date),
    // neighbours see first names and quantities, not flats
    members: members.map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url, quantity: m.quantity, me: m.user_id === user?.id })),
    joined: !!user && members.some((m) => m.user_id === user.id),
  });
}
