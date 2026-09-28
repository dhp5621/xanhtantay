import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionUser } from "@/lib/session";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"];
// The client compresses before upload (images ≤1280px WebP, video ≤720p/25fps/30s);
// these caps only stop uncompressed uploads from eating the 1 GB store.
const MAX_IMAGE = 3 * 1024 * 1024;
const MAX_VIDEO = 12 * 1024 * 1024;
// Refund evidence may run to 60 s (≈1.2 Mbps → about 10 MB; phones that cannot re-encode send more).
const MAX_EVIDENCE_VIDEO = 30 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Không có file" }, { status: 400 });

  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Chỉ nhận ảnh hoặc video" }, { status: 400 });
  const isVideo = file.type.startsWith("video/");
  const evidence = formData.get("purpose") === "refund";
  if (file.size > (isVideo ? (evidence ? MAX_EVIDENCE_VIDEO : MAX_VIDEO) : MAX_IMAGE)) {
    return NextResponse.json({ error: isVideo ? (evidence ? "Video quá lớn (tối đa 30MB, ≤60 giây)" : "Video quá lớn (tối đa 12MB sau khi nén, ≤30 giây)") : "Ảnh quá lớn (tối đa 3MB)" }, { status: 400 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Chưa cấu hình lưu trữ ảnh" }, { status: 503 });

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const blob = await put(`${evidence ? "refund" : "diary"}/${user.id}/${Date.now()}-${safeName}`, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
