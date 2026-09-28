import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { farms, produce } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { addressOf } from "@/lib/address";
import { fileRequest, produceProposals } from "@/lib/requests";

const CATEGORIES = ["rau_la", "cu_qua"];
// A photo resized on the device (about 480 px) fits well inside this.
const MAX_IMAGE_CHARS = 160_000;
const IMAGE = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

/**
 * POST { name, category: "rau_la" | "cu_qua", daily_kg, image_url?, note? }
 * A farmer proposes a produce that is not on the list yet, with a photo. The operator approves it
 * in /admin; only then does it join the list and the farm's supply.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "farmer") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const [farm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));
  if (!farm) return NextResponse.json({ error: "Bạn chưa có vườn" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (name.length < 2) return NextResponse.json({ error: "Tên rau củ cần ít nhất 2 ký tự" }, { status: 400 });
  const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : "rau_la";
  const kg = Math.round(Number(body.daily_kg));
  if (!Number.isFinite(kg) || kg < 1 || kg > 500) return NextResponse.json({ error: "Sản lượng mỗi ngày từ 1 đến 500 kg" }, { status: 400 });
  let image: string | null = null;
  if (typeof body.image_url === "string" && body.image_url) {
    if (body.image_url.length > MAX_IMAGE_CHARS || !IMAGE.test(body.image_url)) return NextResponse.json({ error: "Ảnh phải là ảnh đã thu nhỏ (tối đa khoảng 100KB)" }, { status: 400 });
    image = body.image_url;
  }
  const note = String(body.note ?? "").trim().slice(0, 300) || null;
  const all = await db.select({ name: produce.name }).from(produce);
  const you = (await addressOf(user.id, "farmer")).pronoun;
  const You = you.charAt(0).toUpperCase() + you.slice(1);
  if (all.some((p) => fold(p.name) === fold(name))) return NextResponse.json({ error: `"${name}" đã có trong danh sách. ${You} đăng ký ngay ở mục rau củ có sẵn nhé.` }, { status: 409 });
  const open = (await produceProposals(farm.id)).filter((p) => p.status === "pending");
  if (open.some((p) => fold(p.name) === fold(name))) return NextResponse.json({ error: `"${name}" đang chờ duyệt rồi ạ` }, { status: 409 });
  if (open.length >= 5) return NextResponse.json({ error: "Đang có 5 loại chờ duyệt. Xin chờ quản trị duyệt bớt rồi gửi tiếp ạ." }, { status: 429 });
  await fileRequest(farm.id, "produce", { name, category, daily_kg: kg, image_url: image, note });
  return NextResponse.json({ proposals: await produceProposals(farm.id) }, { status: 202 });
}
