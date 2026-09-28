export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { asc, desc, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { users, clusters, farms, produce, farm_capacity, boxes, box_items, orders, subscriptions, group_orders, harvest_commands, harvest_runs } from "@/db/schema";
import { sectionByKey } from "@/lib/admin-config";
import { AdminTable, type Column as ViewColumn } from "@/components/admin/AdminTable";
import { Icon } from "@/components/ui/Icon";
import { formatVND, ORDER_TYPE_LABELS } from "@/lib/format";
import { FREQUENCY_LABELS, SIZE_LABELS, formatKg, formatYMD } from "@/lib/commerce";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: sectionByKey(section)?.label ?? "Quản trị" };
}

type Row = Record<string, unknown> & { id: string };
/** Server-side column: may carry a render fn; it is applied here and never sent to the client. */
interface Column extends ViewColumn { render?: (v: unknown, row: Row) => string }
type Lookups = Record<string, { value: string; label: string }[]>;

const dt = (v: unknown) => (v ? new Date(v as string).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : "");
const day = (v: unknown) => (v ? formatYMD(String(v).slice(0, 10), { weekday: "short", day: "numeric", month: "numeric" }) : "");

async function load(key: string): Promise<{ rows: Row[]; columns: Column[]; hint?: string; lookups?: Lookups }> {
  switch (key) {
    case "orders": {
      const rows = await db.select({ o: orders, box: boxes.name, customer: users.name, phone: users.phone, cluster: clusters.name }).from(orders)
        .innerJoin(boxes, eq(orders.box_id, boxes.id)).leftJoin(users, eq(orders.user_id, users.id)).leftJoin(clusters, eq(orders.cluster_id, clusters.id)).orderBy(desc(orders.delivery_date), desc(orders.created_at));
      return {
        rows: rows.map((r) => ({ ...r.o, box_name: r.box, customer_name: r.customer ?? "", phone: r.phone ?? "", cluster_name: r.cluster ?? "", allocated: r.o.run_id ? "Đã chốt" : "Chờ 18h" })) as Row[],
        columns: [
          { key: "customer_name", label: "Khách" }, { key: "box_name", label: "Hộp" }, { key: "quantity", label: "SL" },
          { key: "cluster_name", label: "Chung cư" }, { key: "address", label: "Căn hộ" },
          { key: "delivery_date", label: "Giao", render: day }, { key: "type", label: "Loại", render: (v) => ORDER_TYPE_LABELS[String(v)] ?? String(v) },
          { key: "total", label: "Tổng", render: (v) => formatVND(Number(v)) }, { key: "allocated", label: "Chốt sổ" },
        ],
        hint: "Trạng thái thường đổi theo chuyến ở trang Bộ não; sửa ở đây chỉ khi cần điều chỉnh riêng một đơn.",
      };
    }
    case "boxes": {
      const rows = await db.select().from(boxes).orderBy(asc(boxes.price));
      const weights = await db.select({ box_id: box_items.box_id, s: sum(box_items.quantity_kg) }).from(box_items).groupBy(box_items.box_id);
      const w = new Map(weights.map((x) => [x.box_id, Number(x.s ?? 0)]));
      return {
        rows: rows.map((b) => ({ ...b, meal_plan: undefined, items_kg: w.get(b.id) ?? 0, menu_days: b.meal_plan.length })) as unknown as Row[],
        columns: [
          { key: "name", label: "Hộp" }, { key: "size", label: "Cỡ", render: (v) => SIZE_LABELS[String(v)] ?? String(v) },
          { key: "weight_kg", label: "Khối lượng", render: (v, r) => `${formatKg(Number(v))} (thành phần ${formatKg(Number(r.items_kg))})` },
          { key: "price", label: "Giá", render: (v) => formatVND(Number(v)) }, { key: "season", label: "Mùa" },
          { key: "servings", label: "Người" }, { key: "menu_days", label: "Thực đơn", render: (v) => `${v} ngày` }, { key: "slug", label: "Slug", mono: true },
        ],
        hint: "Thành phần sửa ở mục “Thành phần hộp”. Thực đơn theo ngày nằm trong mã nguồn (src/db/menu.ts).",
      };
    }
    case "box_items": {
      const rows = await db.select({ it: box_items, box: boxes.name, p: produce.name }).from(box_items).innerJoin(boxes, eq(box_items.box_id, boxes.id)).innerJoin(produce, eq(box_items.produce_id, produce.id)).orderBy(asc(boxes.price), desc(box_items.quantity_kg));
      const [bx, pr] = await Promise.all([db.select({ value: boxes.id, label: boxes.name }).from(boxes), db.select({ value: produce.id, label: produce.name }).from(produce)]);
      return {
        rows: rows.map((r) => ({ ...r.it, box_name: r.box, produce_name: r.p })) as Row[],
        columns: [{ key: "box_name", label: "Hộp" }, { key: "produce_name", label: "Rau củ" }, { key: "quantity_kg", label: "Số ký", render: (v) => formatKg(Number(v)) }],
        lookups: { box_id: bx, produce_id: pr },
      };
    }
    case "produce": {
      const rows = await db.select().from(produce).orderBy(asc(produce.name));
      const caps = await db.select({ produce_id: farm_capacity.produce_id, s: sum(farm_capacity.daily_kg) }).from(farm_capacity).groupBy(farm_capacity.produce_id);
      const c = new Map(caps.map((x) => [x.produce_id, Number(x.s ?? 0)]));
      return {
        rows: rows.map((p) => ({ ...p, capacity: c.get(p.id) ?? 0, has_image: p.image_url ? "Có" : "" })) as Row[],
        columns: [{ key: "name", label: "Rau củ" }, { key: "capacity", label: "Tổng năng suất", render: (v) => `${formatKg(Number(v))}/ngày` }, { key: "has_image", label: "Ảnh" }, { key: "id", label: "ID", mono: true }],
      };
    }
    case "farm_capacity": {
      const rows = await db.select({ c: farm_capacity, farm: farms.name, p: produce.name }).from(farm_capacity).innerJoin(farms, eq(farm_capacity.farm_id, farms.id)).innerJoin(produce, eq(farm_capacity.produce_id, produce.id)).orderBy(asc(farms.name), desc(farm_capacity.daily_kg));
      const [fs, pr] = await Promise.all([db.select({ value: farms.id, label: farms.name }).from(farms), db.select({ value: produce.id, label: produce.name }).from(produce)]);
      return {
        rows: rows.map((r) => ({ ...r.c, farm_name: r.farm, produce_name: r.p })) as Row[],
        columns: [{ key: "farm_name", label: "Nông hộ" }, { key: "produce_name", label: "Rau củ" }, { key: "daily_kg", label: "Năng suất", render: (v) => `${formatKg(Number(v))}/ngày` }],
        hint: "Bộ não không bao giờ giao lệnh vượt năng suất đã đăng ký.",
        lookups: { farm_id: fs, produce_id: pr },
      };
    }
    case "farms": {
      const rows = await db.select({ farm: farms, owner: users.name }).from(farms).leftJoin(users, eq(farms.owner_id, users.id)).orderBy(asc(farms.province));
      const owners = await db.select({ value: users.id, label: users.name }).from(users).where(eq(users.role, "farmer"));
      return {
        rows: rows.map(({ farm, owner }) => ({ ...farm, owner_name: owner ?? "" })) as Row[],
        columns: [{ key: "name", label: "Vườn" }, { key: "location", label: "Địa điểm" }, { key: "province", label: "Tỉnh" }, { key: "owner_name", label: "Chủ vườn" }, { key: "slug", label: "Slug", mono: true }],
        lookups: { owner_id: owners },
      };
    }
    case "harvest_commands": {
      const rows = await db.select({ c: harvest_commands, farm: farms.name, date: harvest_runs.delivery_date }).from(harvest_commands).innerJoin(farms, eq(harvest_commands.farm_id, farms.id)).innerJoin(harvest_runs, eq(harvest_commands.run_id, harvest_runs.id)).orderBy(desc(harvest_runs.delivery_date), asc(farms.name));
      return {
        rows: rows.map((r) => ({ ...r.c, items: undefined, farm_name: r.farm, delivery_date: r.date })) as unknown as Row[],
        columns: [{ key: "delivery_date", label: "Chuyến", render: day }, { key: "farm_name", label: "Nông hộ" }, { key: "total_kg", label: "Tổng", render: (v) => formatKg(Number(v)) }, { key: "message", label: "Tin nhắn", clamp: true }, { key: "confirmed_at", label: "Xác nhận lúc", render: dt }],
      };
    }
    case "subscriptions": {
      const rows = await db.select({ s: subscriptions, box: boxes.name, price: boxes.price, customer: users.name, cluster: clusters.name }).from(subscriptions).innerJoin(boxes, eq(subscriptions.box_id, boxes.id)).leftJoin(users, eq(subscriptions.user_id, users.id)).leftJoin(clusters, eq(subscriptions.cluster_id, clusters.id));
      return {
        rows: rows.map((r) => ({ ...r.s, box_name: r.box, customer_name: r.customer ?? "", cluster_name: r.cluster ?? "", per_cycle: r.price * r.s.quantity, freq_label: FREQUENCY_LABELS[r.s.frequency] })) as Row[],
        columns: [{ key: "customer_name", label: "Khách" }, { key: "box_name", label: "Hộp" }, { key: "cluster_name", label: "Chung cư" }, { key: "next_delivery", label: "Hộp tiếp theo", render: day }, { key: "per_cycle", label: "Mỗi kỳ", render: (v) => formatVND(Number(v)) }],
      };
    }
    case "group_orders": {
      const rows = await db.select({ g: group_orders, box: boxes.name, cluster: clusters.name }).from(group_orders).innerJoin(boxes, eq(group_orders.box_id, boxes.id)).innerJoin(clusters, eq(group_orders.cluster_id, clusters.id)).orderBy(desc(group_orders.delivery_date));
      return {
        rows: rows.map((r) => ({ ...r.g, box_name: r.box, cluster_name: r.cluster })) as Row[],
        columns: [{ key: "title", label: "Nhóm" }, { key: "cluster_name", label: "Chung cư" }, { key: "box_name", label: "Hộp" }, { key: "current_members", label: "Số nhà", render: (v, r) => `${v}/${r.min_members}` }, { key: "delivery_date", label: "Giao", render: day }],
      };
    }
    case "clusters": {
      const rows = await db.select().from(clusters).orderBy(asc(clusters.name));
      const counts = await db.select({ id: users.cluster_id }).from(users);
      const n = new Map<string, number>();
      for (const c of counts) if (c.id) n.set(c.id, (n.get(c.id) ?? 0) + 1);
      return {
        rows: rows.map((c) => ({ ...c, residents: n.get(c.id) ?? 0 })) as Row[],
        columns: [{ key: "name", label: "Chung cư" }, { key: "address", label: "Địa chỉ" }, { key: "district", label: "Quận" }, { key: "residents", label: "Khách" }, { key: "id", label: "ID", mono: true }],
      };
    }
    case "users": {
      const rows = await db.select({ u: users, cluster: clusters.name }).from(users).leftJoin(clusters, eq(users.cluster_id, clusters.id)).orderBy(desc(users.created_at));
      const cl = await db.select({ value: clusters.id, label: clusters.name }).from(clusters);
      return {
        rows: rows.map((r) => ({ ...r.u, avatar_url: undefined, password_hash: undefined, cluster_name: r.cluster ?? "" })) as unknown as Row[],
        columns: [{ key: "name", label: "Tên" }, { key: "email", label: "Email" }, { key: "phone", label: "Điện thoại" }, { key: "cluster_name", label: "Chung cư" }, { key: "address", label: "Căn hộ" }, { key: "created_at", label: "Tạo lúc", render: dt }],
        lookups: { cluster_id: cl },
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
  // Client components cannot receive functions: pre-format rendered columns into "__key" strings.
  const viewColumns: ViewColumn[] = columns.map((c) => ({ key: c.render ? `__${c.key}` : c.key, label: c.label, mono: c.mono, clamp: c.clamp }));
  const viewRows = rows.map((r) => {
    const o: Row = { ...r };
    for (const c of columns) if (c.render) o[`__${c.key}`] = c.render(r[c.key], r);
    return o;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="anim-in" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span className="m3-list-leading" style={{ width: 52, height: 52, background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)" }}><Icon name={section.icon} size={28} filled /></span>
        <div>
          <h1 className="headline-md text-on-surface">{section.label}</h1>
          <p className="body-md text-on-surface-variant">{section.desc} · {rows.length} mục{hint ? ` · ${hint}` : ""}</p>
        </div>
      </div>
      <AdminTable section={section} rows={viewRows} columns={viewColumns} lookups={lookups} />
    </div>
  );
}
