import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, farms, orders, products, subscriptions, group_order_members } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { normalizePrefs } from "@/lib/recipe-prefs";

// Avatars are stored inline as a tiny data URL (96×96 WebP ≈ 3–5 KB), never in Blob storage.
const MAX_AVATAR_CHARS = 24 * 1024;
const DATA_URL = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;

/** Profile + the role-aware counters the account page shows (same queries as apps/web/src/app/(customer)/tai-khoan/page.tsx). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, avatar_url: users.avatar_url, recipe_prefs: users.recipe_prefs })
    .from(users)
    .where(eq(users.id, user.id));
  if (!row) return NextResponse.json(null);

  let stats: Record<string, number>;
  let farm: { id: string; name: string; slug: string; location: string } | null = null;
  if (row.role === "farmer") {
    const [myFarm] = await db.select({ id: farms.id, name: farms.name, slug: farms.slug, location: farms.location }).from(farms).where(eq(farms.owner_id, user.id));
    farm = myFarm ?? null;
    const [[pending], [prods], [subs]] = myFarm
      ? await Promise.all([
          db.select({ c: count() }).from(orders).where(and(eq(orders.farm_id, myFarm.id), eq(orders.status, "harvesting"))),
          db.select({ c: count() }).from(products).where(eq(products.farm_id, myFarm.id)),
          db.select({ c: count() }).from(subscriptions).where(and(eq(subscriptions.farm_id, myFarm.id), eq(subscriptions.active, true))),
        ])
      : [[{ c: 0 }], [{ c: 0 }], [{ c: 0 }]];
    stats = { pendingOrders: pending.c, products: prods.c, subscribers: subs.c };
  } else {
    const [[o], [s], [g]] = await Promise.all([
      db.select({ c: count() }).from(orders).where(eq(orders.user_id, user.id)),
      db.select({ c: count() }).from(subscriptions).where(and(eq(subscriptions.user_id, user.id), eq(subscriptions.active, true))),
      db.select({ c: count() }).from(group_order_members).where(eq(group_order_members.user_id, user.id)),
    ]);
    stats = { orders: o.c, activeSubscriptions: s.c, groups: g.c };
  }

  return NextResponse.json({ ...row, recipe_prefs: normalizePrefs(row.recipe_prefs), stats, farm });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { avatar_url, name, phone, recipe_prefs } = (body ?? {}) as { avatar_url?: unknown; name?: unknown; phone?: unknown; recipe_prefs?: unknown };
  const updates: Partial<typeof users.$inferInsert> = {};

  if (avatar_url === null) updates.avatar_url = null;
  else if (typeof avatar_url === "string") {
    if (avatar_url.length > MAX_AVATAR_CHARS || !DATA_URL.test(avatar_url)) {
      return NextResponse.json({ error: "Ảnh đại diện phải là ảnh đã nén (tối đa 24KB)" }, { status: 400 });
    }
    updates.avatar_url = avatar_url;
  }
  if (typeof name === "string" && name.trim().length >= 2) updates.name = name.trim().slice(0, 60);
  if (typeof phone === "string") updates.phone = phone.replace(/[^\d+ ]/g, "").slice(0, 20) || null;
  if (recipe_prefs !== undefined) updates.recipe_prefs = normalizePrefs(recipe_prefs);
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 });

  const [row] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning({ id: users.id, name: users.name, avatar_url: users.avatar_url, recipe_prefs: users.recipe_prefs });
  return NextResponse.json(row);
}
