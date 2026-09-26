import { NextResponse } from "next/server";
import { db } from "@/db";
import { farms } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const [farm] = await db.select().from(farms).where(eq(farms.id, params.id));
  if (!farm) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json(farm);
}
