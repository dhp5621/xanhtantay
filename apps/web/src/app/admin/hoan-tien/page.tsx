export const dynamic = "force-dynamic";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { boxes, callName, clusters, orders, refund_requests, users } from "@/db/schema";
import { Icon } from "@/components/ui/Icon";
import { Evidence } from "@/components/refund/Evidence";
import { RefundReview } from "@/components/admin/RefundReview";
import { addressPerson, formatYMD } from "@/lib/commerce";
import { formatClock, formatVND } from "@/lib/format";
import { methodLabel, reasonLabel, REFUND_STATUS } from "@/lib/refund-config";

export const metadata = { title: "Trả hàng / Hoàn tiền" };

export default async function RefundsPage({ searchParams }: { searchParams: Promise<{ xem?: string }> }) {
  const all = (await searchParams).xem === "tat-ca";
  const rows = await db
    .select({ r: refund_requests, o: orders, box: boxes.name, cluster: clusters.name, customer: callName, phone: users.phone })
    .from(refund_requests)
    .innerJoin(orders, eq(refund_requests.order_id, orders.id))
    .innerJoin(boxes, eq(orders.box_id, boxes.id))
    .innerJoin(users, eq(refund_requests.user_id, users.id))
    .leftJoin(clusters, eq(orders.cluster_id, clusters.id))
    .orderBy(desc(refund_requests.created_at))
    .limit(100);
  const waiting = rows.filter((x) => x.r.status === "pending");
  const shown = all ? rows : waiting;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="m3-eyebrow">Sau khi giao</p>
          <h1 className="headline-lg text-on-surface">Trả hàng / Hoàn tiền</h1>
          <p className="body-md text-on-surface-variant">{waiting.length ? `${waiting.length} yêu cầu đang chờ xác minh` : "Không có yêu cầu nào đang chờ"} · xem ảnh, video rồi báo kết quả cho khách</p>
        </div>
        <div className="m3-button-group" style={{ display: "flex" }}>
          <Link href="/admin/hoan-tien" className={`m3-seg ${all ? "" : "selected"}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Chờ xác minh</Link>
          <Link href="/admin/hoan-tien?xem=tat-ca" className={`m3-seg ${all ? "selected" : ""}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Tất cả</Link>
        </div>
      </header>

      {shown.length === 0 ? <p className="body-md text-on-surface-variant">{all ? "Chưa có yêu cầu nào." : "Mọi yêu cầu đã được xử lý."}</p> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {shown.map(({ r, o, box, cluster, customer, phone }) => {
            const s = REFUND_STATUS[r.status] ?? REFUND_STATUS.pending;
            return (
              <article key={r.id} className="m3-card-elevated" style={{ padding: "18px 20px", borderRadius: "var(--shape-xl)" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap" style={{ marginBottom: 12 }}>
                  <div>
                    <p className="title-md text-on-surface">{addressPerson(customer).call}{phone ? ` · ${phone}` : ""}</p>
                    <p className="body-sm text-on-surface-variant">{o.quantity} × {box} · {formatVND(o.total)} · giao {formatYMD(o.delivery_date, { day: "numeric", month: "numeric" })}{cluster ? ` · ${cluster}` : ""}</p>
                    <p className="body-sm text-on-surface-variant">Gửi lúc {formatClock(r.created_at)} · mã đơn #{o.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <span className={`m3-chip sm round ${r.status === "approved" ? "m3-chip-primary" : r.status === "rejected" ? "m3-chip-error" : "m3-chip-tertiary"}`}><Icon name={s.icon} size={14} filled /> {s.label}</span>
                </div>
                <dl className="m3-diff" style={{ marginBottom: 12 }}>
                  <div style={{ display: "contents" }}><dt>Lý do</dt><dd><ins>{reasonLabel(r.reason)}</ins></dd></div>
                  <div style={{ display: "contents" }}><dt>Khách mô tả</dt><dd style={{ whiteSpace: "pre-wrap" }}>{r.description}</dd></div>
                  <div style={{ display: "contents" }}><dt>Mong muốn</dt><dd>{methodLabel(r.method)}</dd></div>
                  {r.status === "approved" && <div style={{ display: "contents" }}><dt>Đã xử lý</dt><dd><ins>{methodLabel(r.resolution)}{r.refund_amount ? ` ${formatVND(r.refund_amount)}` : ""}</ins></dd></div>}
                  {r.note && <div style={{ display: "contents" }}><dt>Lời nhắn</dt><dd>{r.note}</dd></div>}
                </dl>
                <Evidence photos={r.photos} video={r.video_url} />
                {r.status === "pending" && <RefundReview id={r.id} asked={r.method} total={o.total} />}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
