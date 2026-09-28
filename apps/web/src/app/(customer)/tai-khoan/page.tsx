export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { orders, subscriptions, farms, users, clusters, harvest_commands } from "@/db/schema";
import { and, count, eq, ne } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { getClusters } from "@/lib/queries";
import { Icon } from "@/components/ui/Icon";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AvatarUploader } from "@/components/auth/AvatarUploader";
import { ProfileForm } from "@/components/account/ProfileForm";
import { WebPushToggle } from "@/components/WebPushToggle";

export const metadata = { title: "Tài khoản" };

interface Stat { icon: string; label: string; value: number; href: string }
interface MenuItem { href: string; icon: string; label: string; desc: string }

export default async function TaiKhoanPage() {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?next=/tai-khoan");
  const isFarmer = user.role === "farmer";

  const [[me], clusterList] = await Promise.all([
    db.select({ name: users.name, phone: users.phone, avatar_url: users.avatar_url, cluster_id: users.cluster_id, address: users.address, gender: users.gender, salutation: users.salutation, short_name: users.short_name, cluster: clusters.name }).from(users).leftJoin(clusters, eq(users.cluster_id, clusters.id)).where(eq(users.id, user.id)),
    getClusters(),
  ]);

  let stats: Stat[], menuItems: MenuItem[], subtitle: string | null = null;
  if (isFarmer) {
    const [myFarm] = await db.select().from(farms).where(eq(farms.owner_id, user.id));
    const [[all], [done]] = myFarm
      ? await Promise.all([
          db.select({ c: count() }).from(harvest_commands).where(eq(harvest_commands.farm_id, myFarm.id)),
          db.select({ c: count() }).from(harvest_commands).where(and(eq(harvest_commands.farm_id, myFarm.id), eq(harvest_commands.status, "confirmed"))),
        ])
      : [[{ c: 0 }], [{ c: 0 }]];
    subtitle = myFarm ? `${myFarm.name} · ${myFarm.location}` : "Chưa gắn với vườn nào";
    stats = [
      { icon: "sms", label: "Lệnh đã nhận", value: all.c, href: "/farmer" },
      { icon: "thumb_up", label: "Đã xác nhận", value: done.c, href: "/farmer" },
      { icon: "pending_actions", label: "Chờ xác nhận", value: all.c - done.c, href: "/farmer" },
    ];
    menuItems = [
      { href: "/farmer", icon: "agriculture", label: "Lệnh thu hoạch", desc: "Tin nhắn hôm nay, trả lời Có hoặc Không" },
      { href: "/farmer/nang-suat", icon: "scale", label: "Rau củ đăng ký", desc: "Mỗi ngày cắt được bao nhiêu ký mỗi loại" },
      { href: "/farmer/vuon", icon: "storefront", label: "Thông tin vườn", desc: "Tên, địa chỉ, lời giới thiệu" },
      ...(myFarm ? [{ href: `/farms/${myFarm.slug}`, icon: "visibility", label: "Trang vườn của tôi", desc: "Khách hàng thấy vườn như thế nào" }] : []),
    ];
  } else {
    const [[o], [s], [g]] = await Promise.all([
      db.select({ c: count() }).from(orders).where(and(eq(orders.user_id, user.id), ne(orders.status, "cancelled"))),
      db.select({ c: count() }).from(subscriptions).where(and(eq(subscriptions.user_id, user.id), eq(subscriptions.active, true))),
      db.select({ c: count() }).from(orders).where(and(eq(orders.user_id, user.id), eq(orders.type, "group"), ne(orders.status, "cancelled"))),
    ]);
    subtitle = me?.cluster ? `${me.cluster}${me.address ? ` · ${me.address}` : ""}` : user.email ?? null;
    stats = [
      { icon: "package_2", label: "Hộp đã đặt", value: o.c, href: "/don-hang" },
      { icon: "event_repeat", label: "Gói đang chạy", value: s.c, href: "/dinh-ky" },
      { icon: "groups", label: "Lần gom đơn", value: g.c, href: "/gom-don" },
    ];
    menuItems = [
      { href: "/don-hang", icon: "package_2", label: "Đơn hàng của tôi", desc: "Hành trình hộp rau và thực đơn" },
      { href: "/dinh-ky", icon: "event_repeat", label: "Gói định kỳ", desc: "Hộp rau tự về mỗi kỳ" },
      { href: "/gom-don", icon: "groups", label: "Gom đơn chung", desc: "Cùng toà nhà, miễn ship" },
      { href: "/farms", icon: "potted_plant", label: "Nông hộ đối tác", desc: "Ai trồng rau cho hộp của bạn" },
    ];
  }

  return (
    <div className="max-w-md mx-auto flex flex-col gap-5">
      <div className="anim-in-scale" style={{ background: isFarmer ? "linear-gradient(135deg, var(--md-tertiary-container), var(--md-primary-container))" : "linear-gradient(135deg, var(--md-primary-container), var(--md-tertiary-container))", borderRadius: "var(--shape-xl-inc)", padding: "28px 24px", display: "flex", alignItems: "center", gap: 18 }}>
        <AvatarUploader name={me?.name ?? user.name} src={me?.avatar_url} tone={isFarmer ? "tertiary" : "primary"} />
        <div style={{ minWidth: 0 }}>
          <p className="headline-sm" style={{ color: "var(--md-on-primary-container)" }}>{me?.name ?? user.name}</p>
          <p className="body-sm" style={{ color: "var(--md-on-primary-container)", opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</p>
          <span className="m3-chip sm round" style={{ marginTop: 8, background: "var(--md-surface-container-lowest)", boxShadow: "none" }}>
            <Icon name={isFarmer ? "agriculture" : "inventory_2"} size={16} filled />{isFarmer ? "Nhà vườn" : "Khách hàng"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 stagger">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="m3-card-filled lift" style={{ padding: "14px 12px", textAlign: "center", textDecoration: "none", borderRadius: "var(--shape-lg-inc)" }}>
            <Icon name={s.icon} className="text-primary" />
            <p className="headline-sm text-on-surface tabular" style={{ marginTop: 4 }}>{s.value}</p>
            <p className="body-sm text-on-surface-variant">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="m3-list-group stagger">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} className="m3-list-item">
            <span className="m3-list-leading"><Icon name={item.icon} /></span>
            <span><span style={{ display: "block" }}>{item.label}</span><span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{item.desc}</span></span>
            <span className="m3-list-trailing"><Icon name="chevron_right" /></span>
          </Link>
        ))}
      </div>

      {me && <div className="anim-in delay-3"><ProfileForm initial={{ name: me.name, phone: me.phone, cluster_id: me.cluster_id, address: me.address, gender: me.gender, salutation: me.salutation, short_name: me.short_name }} clusters={clusterList} showAddress={!isFarmer} farmer={isFarmer} /></div>}

      <div className="m3-card m3-card-filled anim-in delay-4" style={{ padding: 16 }}><WebPushToggle /></div>
      <div className="anim-in delay-4" style={{ display: "flex", justifyContent: "center" }}><SignOutButton /></div>
    </div>
  );
}
