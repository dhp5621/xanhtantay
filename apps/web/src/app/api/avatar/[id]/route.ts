import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/** The user's avatar as an image file. The address carries a version, so browsers may keep it. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select({ avatar: users.avatar_url }).from(users).where(eq(users.id, id));
  const m = row?.avatar?.match(/^data:(image\/(?:webp|jpeg|png));base64,(.+)$/);
  if (!m) return new Response(null, { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
