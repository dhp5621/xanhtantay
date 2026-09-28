"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSnackbar } from "@/components/ui/Snackbar";

const INTERVAL_MS = 15_000;
const KEY = "xtt-seen-notifications";

interface Item { id: string; title: string; body: string; url: string; category?: string; data?: Record<string, string> }

function readSeen(): Set<string> | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}
function writeSeen(seen: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen].slice(-100)));
  } catch {
    // private window / storage blocked: notifications may repeat after a reload
  }
}

/** True when real Web Push already delivers to this browser, so polling would only duplicate it. */
async function pushIsOn() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const reg = await navigator.serviceWorker.getRegistration("/");
    return !!(await reg?.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/**
 * Delivery that does not depend on a push service: while a tab is open, polls
 * /api/notifications and announces anything new as a system notification (when allowed)
 * or a snackbar.
 */
export function NotificationPoller() {
  // Re-run on sign-in / sign-out so personal notifications start and stop with the session.
  const { status } = useSession();
  const { show } = useSnackbar();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    let stopped = false;

    const announce = async (n: Item) => {
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          // Registering is what makes the Có / Không buttons possible: only the worker can show and handle them.
          const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(() => navigator.serviceWorker.ready) : undefined;
          if (reg) {
            const commandId = n.category === "harvest_command" ? n.data?.commandId : undefined;
            const options: NotificationOptions & { actions?: { action: string; title: string }[] } = { body: n.body, icon: "/icon.png", badge: "/icon.png", tag: n.id, requireInteraction: !!commandId, data: { url: n.url, commandId: commandId ?? null } };
            if (commandId) options.actions = [{ action: "confirm", title: "Đồng ý" }, { action: "decline", title: "Không đồng ý" }];
            await reg.showNotification(n.title, options);
          } else {
            const note = new Notification(n.title, { body: n.body, icon: "/icon.png", tag: n.id });
            note.onclick = () => {
              window.focus();
              router.push(n.url);
            };
          }
          return;
        } catch {
          // fall through to the snackbar
        }
      }
      show(`${n.title}: ${n.body}`, { duration: 8000 });
    };

    const tick = async () => {
      if (stopped || (await pushIsOn())) return;
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const { notifications } = (await res.json()) as { notifications: Item[] };
        const seen = readSeen();
        // First run on this browser: remember what exists without announcing old news.
        const fresh = seen ? notifications.filter((n) => !seen.has(n.id)) : [];
        const next = seen ?? new Set<string>();
        notifications.forEach((n) => next.add(n.id));
        writeSeen(next);
        for (const n of fresh.reverse()) await announce(n);
      } catch {
        // offline / transient error: try again next tick
      }
    };

    tick();
    const timer = setInterval(tick, INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [status, show, router]);

  return null;
}
