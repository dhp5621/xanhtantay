import { NextResponse } from "next/server";
import { getBox } from "@/lib/queries";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const box = await getBox(slug);
  if (!box) return NextResponse.json({ error: "Không tìm thấy hộp rau" }, { status: 404 });
  return NextResponse.json(box);
}
