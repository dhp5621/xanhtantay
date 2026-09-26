"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { useSnackbar } from "@/components/ui/Snackbar";
import { makeAvatarDataUrl } from "@/lib/media";

/** Avatar with a change menu: take a photo, pick from device, or remove. Stores a 96×96 WebP in the DB. */
export function AvatarUploader({ name, src, tone = "primary" }: { name?: string | null; src?: string | null; tone?: "primary" | "tertiary" }) {
  const [current, setCurrent] = useState<string | null>(src ?? null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { update } = useSession();
  const { show } = useSnackbar();

  const save = async (avatar_url: string | null) => {
    setBusy(true);
    try {
      const res = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar_url }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Không lưu được");
      setCurrent(avatar_url);
      await update(); // refresh the session so the header avatar changes immediately
      router.refresh();
      show(avatar_url ? "Đã đổi ảnh đại diện" : "Đã gỡ ảnh đại diện", { kind: "success", duration: 2000 });
    } catch (e) {
      show(e instanceof Error ? e.message : "Có lỗi xảy ra", { kind: "error" });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const dataUrl = await makeAvatarDataUrl(f, 96);
      await save(dataUrl);
    } catch {
      show("Không đọc được ảnh này", { kind: "error" });
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <input ref={pickRef} type="file" accept="image/*" hidden onChange={onFile} />
      <input ref={camRef} type="file" accept="image/*" capture="user" hidden onChange={onFile} />

      <Avatar name={name} src={current} size="xl" style={{ background: `var(--md-${tone})`, color: `var(--md-on-${tone})` }} />
      <button
        type="button"
        className="m3-icon-btn sm filled"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-label="Đổi ảnh đại diện"
        aria-expanded={open}
        style={{ position: "absolute", right: -4, bottom: -4, boxShadow: "var(--elev-2)", border: "2px solid var(--md-surface-container-lowest)" }}
      >
        {busy ? <span className="m3-loader sm on-primary" style={{ width: 16, height: 16 }} /> : <Icon name="photo_camera" size={16} filled />}
      </button>

      {open && (
        <div className="m3-card-elevated anim-in-scale" role="menu" style={{ position: "absolute", top: "100%", left: 0, marginTop: 8, zIndex: 20, minWidth: 220, padding: 6, borderRadius: "var(--shape-lg)", background: "var(--md-surface-container-high)" }}>
          {[
            { icon: "photo_camera", label: "Chụp ảnh mới", act: () => camRef.current?.click() },
            { icon: "image", label: "Chọn từ máy", act: () => pickRef.current?.click() },
            ...(current ? [{ icon: "delete", label: "Gỡ ảnh", act: () => save(null) }] : []),
          ].map((m) => (
            <button key={m.label} type="button" role="menuitem" className="m3-list-item" onClick={() => { setOpen(false); m.act(); }} style={{ width: "100%", background: "transparent", border: "none", padding: "10px 12px", gap: 12, fontSize: 14, borderRadius: "var(--shape-md)", cursor: "pointer", textAlign: "left" }}>
              <Icon name={m.icon} size={20} className={m.icon === "delete" ? "text-error" : "text-primary"} />
              {m.label}
            </button>
          ))}
          <p className="body-sm text-on-surface-variant" style={{ padding: "6px 12px 4px" }}>Ảnh được nén còn 96×96, vài KB.</p>
        </div>
      )}
    </div>
  );
}
