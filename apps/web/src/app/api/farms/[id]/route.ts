import { NextResponse } from "next/server";
import { getFarms } from "@/lib/queries";

/** By id or slug. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [farm] = await getFarms(id);
  if (!farm) return NextResponse.json({ error: "Không tìm thấy vườn" }, { status: 404 });
  return NextResponse.json(farm);
}
