import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { farms } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { produceProposals, withdrawProposal } from "@/lib/requests";

/** Withdraws a proposal that is still waiting for approval. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const [farm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));
  if (!farm) return NextResponse.json({ error: "Bạn chưa có vườn" }, { status: 404 });
  await withdrawProposal(farm.id, id);
  return NextResponse.json({ proposals: await produceProposals(farm.id) });
}
