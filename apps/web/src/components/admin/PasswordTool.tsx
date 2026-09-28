"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useSnackbar } from "@/components/ui/Snackbar";
import { Avatar } from "@/components/ui/Avatar";
import { makeAvatarDataUrl } from "@/lib/media";

interface Account { id: string; name: string; email: string | null; role: string; own: boolean; avatar_url: string | null }

/** For one customer or farmer account: see and change the avatar, set or remove the password. */
export function PasswordTool({ accounts, demoPassword }: { accounts: Account[]; demoPassword: string }) {
  const [id, setId] = useState(accounts[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState<"set" | "reset" | "avatar" | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const file = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { show } = useSnackbar();
  const account = accounts.find((a) => a.id === id);

  const avatar = account ? (account.id in avatars ? avatars[account.id] : account.avatar_url) : null;
  const saveAvatar = async (value: string | null) => {
    setBusy("avatar");
    try {
      const res = await fetch(`/api/admin/users/${id}/avatar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar_url: value }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Chưa đổi được ảnh đại diện");
      setAvatars((a) => ({ ...a, [id]: value }));
      show(value ? `Đã đổi ảnh đại diện của ${account?.name ?? "tài khoản"}` : "Đã gỡ ảnh đại diện", { kind: "success" });
      router.refresh();
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error", duration: 6000 }); }
    finally { setBusy(null); }
  };
  const pickAvatar = async (f?: File | null) => {
    if (!f) return;
    try { await saveAvatar(await makeAvatarDataUrl(f)); }
    catch { show("Không đọc được ảnh này, xin chọn ảnh khác", { kind: "error" }); }
  };

  const send = async (kind: "set" | "reset") => {
    setBusy(kind);
    try {
      const res = await fetch(`/api/admin/users/${id}/password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kind === "set" ? { password } : { reset: true }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Chưa đổi được mật khẩu");
      setPassword("");
      show(kind === "set" ? `Đã đổi mật khẩu cho ${account?.name ?? "tài khoản"}` : `${account?.name ?? "Tài khoản"} dùng lại mật khẩu demo`, { kind: "success" });
      router.refresh();
    } catch (e) { show(e instanceof Error ? e.message : "Có lỗi", { kind: "error", duration: 6000 }); }
    finally { setBusy(null); }
  };

  return (
    <form className="m3-card-filled flex flex-col gap-3" style={{ padding: 20, borderRadius: "var(--shape-xl)" }} onSubmit={(e) => { e.preventDefault(); void send("set"); }}>
      <p className="title-md text-on-surface" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="manage_accounts" filled className="text-primary" /> Ảnh đại diện và mật khẩu</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="m3-field"><label className="m3-field-label" htmlFor="pw-user">Tài khoản</label>
          <select id="pw-user" className="m3-select" value={id} onChange={(e) => setId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.role === "farmer" ? "Nông dân" : "Khách hàng"}{a.email ? ` · ${a.email}` : ""}{a.own ? " · có mật khẩu riêng" : ""}</option>)}
          </select></div>
        <div className="m3-field"><label className="m3-field-label" htmlFor="pw-new">Mật khẩu mới (8 đến 72 ký tự)</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input id="pw-new" className="m3-input" style={{ flex: 1, minWidth: 0 }} type={visible ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={72} />
            <button type="button" className="m3-icon-btn" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={visible}><Icon name={visible ? "visibility_off" : "visibility"} /></button>
          </div></div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Avatar name={account?.name} src={avatar} size="xl" />
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void pickAvatar(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="flex flex-col gap-1">
          <span className="title-md text-on-surface">{account?.name}</span>
          <div className="flex gap-2 flex-wrap">
            <button type="button" className="m3-btn m3-btn-tonal m3-btn-sm" onClick={() => file.current?.click()} disabled={!!busy || !id}>{busy === "avatar" ? <span className="m3-loader sm" /> : <Icon name="photo_camera" size={18} />}<span>Đổi ảnh</span></button>
            {avatar && <button type="button" className="m3-btn m3-btn-text m3-btn-sm" onClick={() => saveAvatar(null)} disabled={!!busy}>Gỡ ảnh</button>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button type="submit" className="m3-btn m3-btn-filled m3-btn-sm" disabled={!!busy || !id || password.length < 8}>{busy === "set" ? <span className="m3-loader sm on-primary" /> : <Icon name="key" size={18} />}<span>Đổi mật khẩu</span></button>
        <button type="button" className="m3-btn m3-btn-text m3-btn-sm" onClick={() => send("reset")} disabled={!!busy || !account?.own}>{busy === "reset" ? <span className="m3-loader sm" /> : <Icon name="restart_alt" size={18} />}<span>Dùng lại mật khẩu demo</span></button>
      </div>
      <p className="body-sm text-on-surface-variant">Tài khoản chưa có mật khẩu riêng đăng nhập bằng mật khẩu demo chung ({demoPassword}). Sau khi đổi, tài khoản chỉ đăng nhập được bằng mật khẩu mới, kể cả nút đăng nhập nhanh ở trang đăng nhập. Mật khẩu được lưu dạng mã hoá, không xem lại được.</p>
    </form>
  );
}
