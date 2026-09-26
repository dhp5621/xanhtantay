import { NextResponse } from "next/server";
import { db } from "@/db";
import { group_orders, group_order_members, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

/** GET one group order with its member list and whether the current user has joined — used by the mobile app's group detail screen. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [group] = await db.select().from(group_orders).where(eq(group_orders.id, id));
  if (!group) return NextResponse.json({ error: "Không tìm thấy nhóm" }, { status: 404 });

  const [members, user] = await Promise.all([
    db
      .select({ id: group_order_members.id, user_id: group_order_members.user_id, name: users.name })
      .from(group_order_members)
      .leftJoin(users, eq(group_order_members.user_id, users.id))
      .where(eq(group_order_members.group_order_id, id)),
    getSessionUser(),
  ]);

  const joined = !!user && members.some((m) => m.user_id === user.id);
  return NextResponse.json({ ...group, members, joined });
}
