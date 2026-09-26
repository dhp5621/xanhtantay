import { NextResponse } from "next/server";
import { db } from "@/db";
import { farms } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [farm] = await db.select().from(farms).where(eq(farms.id, id));
  if (!farm) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json(farm);
}
