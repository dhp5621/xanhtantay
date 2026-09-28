"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { useSnackbar } from "@/components/ui/Snackbar";
import { makeAvatarDataUrl } from "@/lib/media";
import { Portal } from "@/components/ui/Portal";
import { CameraCapture, hasCameraApi } from "@/components/ui/CameraCapture";

/** Avatar with a change menu: take a photo, pick from device, or remove. Stores a 256×256 WebP in the DB. */
export function AvatarUploader({ name, src, tone = "primary" }: { name?: string | null; src?: string | null; tone?: "primary" | "tertiary" }) {
  const [current, setCurrent] = useState<string | null>(src ?? null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [closingMenu, setClosingMenu] = useState(false);
  const [camera, setCamera] = useState(false);
  const closeMenu = () => { setClosingMenu(true); setTimeout(() => { setClosingMenu(false); setOpen(false); }, 220); };
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

  const useFile = async (f: File) => {
    setBusy(true);
    try {
      const dataUrl = await makeAvatarDataUrl(f);
      await save(dataUrl);
    } catch {
      show("Không đọc được ảnh này", { kind: "error" });
      setBusy(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const dataUrl = await makeAvatarDataUrl(f);
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
        <Portal>
          <div className={`m3-scrim ${closingMenu ? "closing" : ""}`} onClick={closeMenu} aria-hidden />
          <div className={`m3-sheet ${closingMenu ? "closing" : ""}`} role="menu" aria-label="Đổi ảnh đại diện">
            <div className="m3-sheet-handle" />
            <div className="m3-sheet-body" style={{ paddingTop: 12 }}>
              <p className="title-md text-on-surface" style={{ padding: "0 4px 10px" }}>Ảnh đại diện</p>
              <div className="m3-list-group">
                {[
                  { icon: "photo_camera", label: "Chụp ảnh mới", desc: hasCameraApi() ? "Mở camera trong ứng dụng" : "Mở camera của máy", act: () => (hasCameraApi() ? setCamera(true) : camRef.current?.click()) },
                  { icon: "image", label: "Chọn từ máy", desc: "Ảnh có sẵn trong thư viện", act: () => pickRef.current?.click() },
                  ...(current ? [{ icon: "delete", label: "Gỡ ảnh", desc: "Quay về chữ cái đầu tên", act: () => save(null) }] : []),
                ].map((m) => (
                  <button key={m.label} type="button" role="menuitem" className="m3-list-item" onClick={() => { closeMenu(); m.act(); }} style={{ width: "100%", border: "none", cursor: "pointer", textAlign: "left" }}>
                    <span className="m3-list-leading" style={m.icon === "delete" ? { background: "var(--md-error-container)", color: "var(--md-on-error-container)" } : undefined}><Icon name={m.icon} /></span>
                    <span>
                      <span style={{ display: "block" }}>{m.label}</span>
                      <span className="body-sm text-on-surface-variant" style={{ fontWeight: 400 }}>{m.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="body-sm text-on-surface-variant" style={{ padding: "12px 4px 0" }}>Ảnh được cắt vuông và nén còn 256×256.</p>
            </div>
          </div>
        </Portal>
      )}
      {camera && (
        <CameraCapture modes={["photo"]} initialFacing="user" title="Chụp ảnh đại diện" onClose={() => setCamera(false)} onCapture={(f) => void useFile(f)} />
      )}
    </div>
  );
}