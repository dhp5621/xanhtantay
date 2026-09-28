import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { isAdmin } from "@/lib/admin-session";
import { sectionByKey, type Field, type AdminTableName } from "@/lib/admin-config";
import { syncGroupCount } from "@/lib/queries";

const TABLES: Record<AdminTableName, unknown> = {
  users: schema.users, clusters: schema.clusters, farms: schema.farms, produce: schema.produce, farm_capacity: schema.farm_capacity,
  boxes: schema.boxes, box_items: schema.box_items, orders: schema.orders, subscriptions: schema.subscriptions,
  group_orders: schema.group_orders, harvest_commands: schema.harvest_commands,
};

function coerce(field: Field, v: unknown) {
  if (v === undefined) return undefined;
  switch (field.type) {
    case "number": { const n = Number(v); if (!Number.isFinite(n)) throw new Error(`${field.label} không hợp lệ`); return Math.max(field.min ?? -Infinity, Math.round(n)); }
    case "decimal": { const n = Number(String(v).replace(",", ".")); if (!Number.isFinite(n)) throw new Error(`${field.label} không hợp lệ`); return String(Math.max(field.min ?? -Infinity, Math.round(n * 10) / 10)); }
    case "boolean": return v === true || v === "true";
    case "day": { const s = String(v).slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`${field.label} không hợp lệ`); return s; }
    case "list": return Array.isArray(v) ? v.map(String) : String(v).split("\n").map((s) => s.trim()).filter(Boolean);
    case "select": if (field.options && !field.options.some((o) => o.value === v)) throw new Error(`${field.label} không hợp lệ`); return String(v);
    default: { const s = v === null ? null : String(v).trim(); if (field.required && !s) throw new Error(`Thiếu ${field.label}`); return s === "" ? null : s; }
  }
}

function pick(fields: Field[], body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) if (f.key in body) out[f.key] = coerce(f, body[f.key]);
  return out;
}

async function guard(tableKey: string) {
  if (!(await isAdmin())) return { error: NextResponse.json({ error: "Không có quyền quản trị" }, { status: 401 }) };
  const section = sectionByKey(tableKey);
  if (!section) return { error: NextResponse.json({ error: "Không có mục này" }, { status: 404 }) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { section, table: TABLES[section.table] as any };
}

const friendly = (e: unknown) => {
  const msg = e instanceof Error ? e.message : "Lỗi";
  if (/unique|duplicate/i.test(msg)) return "Trùng giá trị duy nhất (email, slug, hoặc cặp vườn–rau đã có)";
  if (/foreign key|violates/i.test(msg)) return "Mục này đang được dùng ở nơi khác (đơn hàng, hộp rau…), hãy gỡ liên kết trước";
  return msg;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ table: string }> }) {
  const { table: key } = await params;
  const g = await guard(key);
  if ("error" in g) return g.error;
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
    const updates = pick(g.section.fields, body);
    if (!Object.keys(updates).length) return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 });
    // Order money follows quantity.
    if (g.section.table === "orders" && "quantity" in updates) {
      const [o] = await db.select({ o: schema.orders, price: schema.boxes.price }).from(schema.orders).innerJoin(schema.boxes, eq(schema.orders.box_id, schema.boxes.id)).where(eq(schema.orders.id, id));
      if (o) { updates.subtotal = o.price * Number(updates.quantity); updates.total = o.price * Number(updates.quantity) + o.o.ship_fee; }
    }
    if (g.section.table === "harvest_commands" && updates.status) updates.confirmed_at = updates.status === "confirmed" ? new Date() : null;
    const [row] = await db.update(g.table).set(updates).where(eq(g.table.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    if (g.section.table === "orders" && row.group_order_id) await syncGroupCount(row.group_order_id);
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: friendly(e) }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ table: string }> }) {
  const { table: key } = await params;
  const g = await guard(key);
  if ("error" in g) return g.error;
  const fields = g.section.createFields ?? g.section.fields;
  if (!fields.length) return NextResponse.json({ error: "Mục này không tạo mới từ trang quản trị" }, { status: 400 });
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const values = pick(fields, body);
    for (const f of fields) if (f.required && (values[f.key] === undefined || values[f.key] === null || values[f.key] === "")) throw new Error(`Thiếu ${f.label}`);
    const rows = (await db.insert(g.table).values(values).returning()) as unknown as Record<string, unknown>[];
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: friendly(e) }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ table: string }> }) {
  const { table: key } = await params;
  const g = await guard(key);
  if ("error" in g) return g.error;
  if (!g.section.canDelete) return NextResponse.json({ error: "Không xoá được mục này" }, { status: 400 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  try {
    // Remove or detach dependants first so foreign keys do not block the delete.
    switch (g.section.table as AdminTableName) {
      case "group_orders": await db.update(schema.orders).set({ group_order_id: null }).where(eq(schema.orders.group_order_id, id)); break;
      case "subscriptions": await db.update(schema.orders).set({ subscription_id: null }).where(eq(schema.orders.subscription_id, id)); break;
      case "clusters": {
        const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(schema.group_orders).where(eq(schema.group_orders.cluster_id, id)));
        if (n > 0) return NextResponse.json({ error: "Chung cư này còn nhóm gom đơn, hãy xoá nhóm trước" }, { status: 409 });
        break;
      }
      case "users": {
        const owned = await db.select({ id: schema.farms.id }).from(schema.farms).where(eq(schema.farms.owner_id, id));
        if (owned.length) return NextResponse.json({ error: "Người này đang sở hữu vườn. Xoá hoặc đổi chủ vườn trước." }, { status: 409 });
        await db.delete(schema.orders).where(eq(schema.orders.user_id, id));
        await db.delete(schema.subscriptions).where(eq(schema.subscriptions.user_id, id));
        break;
      }
      case "farms": {
        const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(schema.harvest_commands).where(eq(schema.harvest_commands.farm_id, id)));
        if (n > 0) return NextResponse.json({ error: "Vườn đã có lệnh thu hoạch trong lịch sử nên không xoá được. Đặt năng suất về 0 để ngừng phân bổ." }, { status: 409 });
        break;
      }
    }
    const [row] = await db.delete(g.table).where(eq(g.table.id, id)).returning({ id: g.table.id });
    if (!row) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: friendly(e) }, { status: 400 });
  }
}
