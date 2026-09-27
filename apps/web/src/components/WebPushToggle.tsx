"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { disableWebPush, enableWebPush, webPushState, type WebPushState } from "@/lib/web-push-client";

const HINT: Record<WebPushState, string> = {
  unsupported: "Trình duyệt này không hỗ trợ thông báo đẩy. Trên iPhone, hãy thêm trang vào Màn hình chính trước.",
  unconfigured: "Máy chủ chưa cấu hình khoá VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY).",
  denied: "Bạn đã chặn thông báo cho trang này. Hãy cho phép lại trong cài đặt trình duyệt.",
  off: "Nhận thông báo từ Xanh Tận Tay trên trình duyệt này.",
  on: "Trình duyệt này đang nhận thông báo.",
};

/** Turn Web Push on/off for the current browser. */
export function WebPushToggle({ small }: { small?: boolean }) {
  const [state, setState] = useState<WebPushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    webPushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  if (!state) return null;
  const on = state === "on";
  const toggle = async () => {
    setBusy(true);
    setError("");
    try {
      setState(on ? await disableWebPush() : await enableWebPush());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không bật được thông báo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={toggle} disabled={busy || (state !== "on" && state !== "off")} className={`m3-btn ${on ? "m3-btn-outlined" : "m3-btn-tonal"} ${small ? "m3-btn-sm" : ""}`}>
          {busy ? <span className="m3-loader sm" /> : <Icon name={on ? "notifications_off" : "notifications_active"} size={18} />}
          <span>{on ? "Tắt thông báo trên trình duyệt này" : "Bật thông báo trên trình duyệt này"}</span>
        </button>
      </div>
      <p className="body-sm text-on-surface-variant">{error || HINT[state]}</p>
    </div>
  );
}
