import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionUser } from "@/lib/session";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Không có file" }, { status: 400 });

  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File quá lớn (tối đa 10MB)" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Chỉ nhận ảnh hoặc video" }, { status: 400 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Chưa cấu hình lưu trữ ảnh" }, { status: 503 });

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const blob = await put(`diary/${user.id}/${Date.now()}-${safeName}`, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
