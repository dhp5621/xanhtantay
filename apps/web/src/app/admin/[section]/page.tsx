export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, farms, products, orders, subscriptions, group_orders, farm_diary, recipes, order_items } from "@/db/schema";
import { sectionByKey } from "@/lib/admin-config";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Icon } from "@/components/ui/Icon";
import { formatVND, formatDateTime, STATUS_SHORT } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: sectionByKey(section)?.label ?? "Quản trị" };
}

type Row = Record<string, unknown> & { id: string };

async function load(key: string): Promise<{ rows: Row[]; columns: Column[]; hint?: string; lookups?: Record<string, { value: string; label: string }[]> }> {
  const dt = (v: unknown) => (v ? formatDateTime(v as Date) : "");
  switch (key) {
    case "users": {
      const rows = await db.select().from(users).orderBy(desc(users.created_at));
      return {
        rows: rows.map((r) => ({ ...r, avatar_url: r.avatar_url ? "✓" : "" })) as Row[],
        columns: [
          { key: "name", label: "Tên" }, { key: "email", label: "Email" }, { key: "phone", label: "Điện thoại" },
          { key: "role", label: "Vai trò", render: (v) => (v === "farmer" ? "Nhà vườn" : "Khách hàng") },
          { key: "created_at", label: "Tạo lúc", render: dt }, { key: "id", label: "ID", mono: true },
        ],
      };
    }
    case "farms": {
      const rows = await db.select({ farm: farms, owner: { name: users.name } }).from(farms).leftJoin(users, eq(farms.owner_id, users.id));
      const owners = await db.select({ value: users.id, label: users.name }).from(users).where(eq(users.role, "farmer"));
      return {
        rows: rows.map(({ farm, owner }) => ({ ...farm, owner_name: owner?.name ?? "" })) as Row[],
        columns: [{ key: "name", label: "Vườn" }, { key: "location", label: "Địa điểm" }, { key: "owner_name", label: "Chủ vườn" }, { key: "slug", label: "Slug", mono: true }, { key: "id", label: "ID", mono: true }],
        lookups: { owner_id: owners.map((o) => ({ value: o.value, label: `${o.label} (${o.value})` })) },
      };
    }
    case "products": {
      const rows = await db.select({ p: products, farm: { name: farms.name } }).from(products).leftJoin(farms, eq(products.farm_id, farms.id));
      const farmOpts = await db.select({ value: farms.id, label: farms.name }).from(farms);
      return {
        rows: rows.map(({ p, farm }) => ({ ...p, farm_name: farm?.name ?? "" })) as Row[],
        columns: [
          { key: "name", label: "Sản phẩm" }, { key: "farm_name", label: "Vườn" },
          { key: "price_per_unit", label: "Giá", render: (v, r) => `${formatVND(Number(v))}/${r.unit}` },
          { key: "stock_qty", label: "Tồn", render: (v, r) => `${v} ${r.unit}` },
          { key: "in_stock", label: "Bán", render: (v) => (v ? "Đang bán" : "Ẩn") }, { key: "category", label: "Loại" },
        ],
        lookups: { farm_id: farmOpts },
      };
    }
    case "orders": {
      const rows = await db.select({ o: orders, farm: { name: farms.name }, customer: { name: users.name, phone: users.phone } }).from(orders)
        .leftJoin(farms, eq(orders.farm_id, farms.id)).leftJoin(users, eq(orders.user_id, users.id)).orderBy(desc(orders.created_at));
      const items = await db.select({ oi: order_items, name: products.name, unit: products.unit }).from(order_items).leftJoin(products, eq(order_items.product_id, products.id));
      const byOrder = new Map<string, string[]>();
      for (const it of items) byOrder.set(it.oi.order_id, [...(byOrder.get(it.oi.order_id) ?? []), `${Number(it.oi.quantity)} ${it.unit ?? ""} ${it.name ?? "?"}`]);
      return {
        rows: rows.map(({ o, farm, customer }) => ({ ...o, farm_name: farm?.name ?? "", customer_name: customer?.name ?? "", phone: customer?.phone ?? "", items: (byOrder.get(o.id) ?? []).join(", ") })) as Row[],
        columns: [
          { key: "customer_name", label: "Khách" }, { key: "farm_name", label: "Vườn" }, { key: "items", label: "Món" },
          { key: "total", label: "Tổng", render: (v) => formatVND(Number(v)) },
          { key: "status", label: "Trạng thái", render: (v) => STATUS_SHORT[String(v)] ?? String(v) },
          { key: "type", label: "Loại" }, { key: "created_at", label: "Lúc", render: dt },
        ],
        hint: "Đổi trạng thái tại đây sẽ hiện ngay cho khách và nhà vườn.",
      };
    }
    case "subscriptions": {
      const rows = await db.select({ s: subscriptions, farm: { name: farms.name }, customer: { name: users.name } }).from(subscriptions)
        .leftJoin(farms, eq(subscriptions.farm_id, farms.id)).leftJoin(users, eq(subscriptions.user_id, users.id));
      return {
        rows: rows.map(({ s, farm, customer }) => ({ ...s, farm_name: farm?.name ?? "", customer_name: customer?.name ?? "", item_count: s.items.length, next_delivery: s.next_delivery })) as Row[],
        columns: [
          { key: "customer_name", label: "Khách" }, { key: "farm_name", label: "Vườn" },
          { key: "frequency", label: "Tần suất", render: (v) => (v === "weekly" ? "Tuần" : "Tháng") },
          { key: "item_count", label: "Món" }, { key: "next_delivery", label: "Giao tiếp", render: dt },
          { key: "active", label: "Trạng thái", render: (v) => (v ? "Hoạt động" : "Tạm dừng") },
        ],
      };
    }
    case "group_orders": {
      const rows = await db.select({ g: group_orders, farm: { name: farms.name } }).from(group_orders).leftJoin(farms, eq(group_orders.farm_id, farms.id)).orderBy(desc(group_orders.created_at));
      return {
        rows: rows.map(({ g, farm }) => ({ ...g, farm_name: farm?.name ?? "" })) as Row[],
        columns: [
          { key: "title", label: "Nhóm" }, { key: "farm_name", label: "Vườn" },
          { key: "current_members", label: "Thành viên", render: (v, r) => `${v}/${r.min_members}` },
          { key: "status", label: "Trạng thái" }, { key: "deadline", label: "Hạn", render: dt }, { key: "shipping_address", label: "Địa chỉ" },
        ],
      };
    }
    case "diary": {
      const rows = await db.select({ d: farm_diary, farm: { name: farms.name } }).from(farm_diary).leftJoin(farms, eq(farm_diary.farm_id, farms.id)).orderBy(desc(farm_diary.created_at));
      return {
        rows: rows.map(({ d, farm }) => ({ ...d, farm_name: farm?.name ?? "", media_count: d.media_urls.length })) as Row[],
        columns: [{ key: "farm_name", label: "Vườn" }, { key: "content", label: "Nội dung", clamp: true }, { key: "media_count", label: "Tệp" }, { key: "created_at", label: "Lúc", render: dt }],
      };
    }
    case "recipes": {
      const rows = await db.select().from(recipes);
      return {
        rows: rows.map((r) => ({ ...r, ingredient_count: r.ingredients.length, step_count: r.steps.length })) as Row[],
        columns: [{ key: "title", label: "Món" }, { key: "ingredient_count", label: "Nguyên liệu" }, { key: "step_count", label: "Bước" }],
      };
    }
    default:
      notFound();
  }
}

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: key } = await params;
  const section = sectionByKey(key);
  if (!section) notFound();
  const { rows, columns, hint, lookups } = await load(key);

  return (
    <div className="flex flex-col gap-6">
      <div className="anim-in" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span className="m3-list-leading" style={{ width: 52, height: 52, background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)" }}><Icon name={section.icon} size={28} filled /></span>
        <div>
          <h1 className="headline-md text-on-surface">{section.label}</h1>
          <p className="body-md text-on-surface-variant">{section.desc} · {rows.length} mục{hint ? ` · ${hint}` : ""}</p>
        </div>
      </div>
      <AdminTable section={section} rows={rows} columns={columns} lookups={lookups} />
    </div>
  );
}

