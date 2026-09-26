import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { isAdmin } from "@/lib/admin-session";
import { sectionByKey, type Field } from "@/lib/admin-config";

const TABLES = {
  users: schema.users, farms: schema.farms, products: schema.products, orders: schema.orders,
  subscriptions: schema.subscriptions, group_orders: schema.group_orders, farm_diary: schema.farm_diary, recipes: schema.recipes,
} as const;

function coerce(field: Field, v: unknown) {
  if (v === undefined) return undefined;
  switch (field.type) {
    case "number": { const n = Number(v); if (!Number.isFinite(n)) throw new Error(`${field.label} không hợp lệ`); return Math.max(field.min ?? -Infinity, Math.round(n)); }
    case "boolean": return v === true || v === "true";
    case "date": { const d = new Date(String(v)); if (Number.isNaN(d.getTime())) throw new Error(`${field.label} không hợp lệ`); return d; }
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
  return { section, table: TABLES[section.table] };
}

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
    // Keep stock and availability consistent for products.
    if (g.section.table === "products" && "stock_qty" in updates && !("in_stock" in updates)) updates.in_stock = (updates.stock_qty as number) > 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = g.table as any;
    const [row] = await db.update(t).set(updates).where(eq(t.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await db.insert(g.table as any).values(values as any).returning()) as unknown as Record<string, unknown>[];
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi";
    return NextResponse.json({ error: /unique|duplicate/i.test(msg) ? "Trùng giá trị duy nhất (email / slug)" : msg }, { status: 400 });
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
    // Remove dependants first so foreign keys do not block the delete.
    switch (g.section.table) {
      case "orders": await db.delete(schema.order_items).where(eq(schema.order_items.order_id, id)); break;
      case "group_orders": await db.delete(schema.group_order_members).where(eq(schema.group_order_members.group_order_id, id)); break;
      case "products": await db.delete(schema.order_items).where(eq(schema.order_items.product_id, id)); break;
      case "farms": {
        const prods = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.farm_id, id));
        for (const p of prods) await db.delete(schema.order_items).where(eq(schema.order_items.product_id, p.id));
        const ords = await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.farm_id, id));
        for (const o of ords) await db.delete(schema.order_items).where(eq(schema.order_items.order_id, o.id));
        await db.delete(schema.orders).where(eq(schema.orders.farm_id, id));
        await db.delete(schema.subscriptions).where(eq(schema.subscriptions.farm_id, id));
        const groups = await db.select({ id: schema.group_orders.id }).from(schema.group_orders).where(eq(schema.group_orders.farm_id, id));
        for (const gr of groups) await db.delete(schema.group_order_members).where(eq(schema.group_order_members.group_order_id, gr.id));
        await db.delete(schema.group_orders).where(eq(schema.group_orders.farm_id, id));
        await db.delete(schema.farm_diary).where(eq(schema.farm_diary.farm_id, id));
        await db.delete(schema.products).where(eq(schema.products.farm_id, id));
        break;
      }
      case "users": {
        const farms = await db.select({ id: schema.farms.id }).from(schema.farms).where(eq(schema.farms.owner_id, id));
        if (farms.length) return NextResponse.json({ error: "Người này đang sở hữu vườn. Xoá hoặc đổi chủ vườn trước." }, { status: 409 });
        const ords = await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.user_id, id));
        for (const o of ords) await db.delete(schema.order_items).where(eq(schema.order_items.order_id, o.id));
        await db.delete(schema.orders).where(eq(schema.orders.user_id, id));
        await db.delete(schema.subscriptions).where(eq(schema.subscriptions.user_id, id));
        await db.delete(schema.group_order_members).where(eq(schema.group_order_members.user_id, id));
        break;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = g.table as any;
    const [row] = await db.delete(t).where(eq(t.id, id)).returning({ id: t.id });
    if (!row) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}
