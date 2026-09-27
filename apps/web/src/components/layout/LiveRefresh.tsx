"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 4000;

/**
 * Keeps every page live: polls the cheap /api/version change signal while the tab is visible and
 * re-renders the server components in place (router.refresh) when anything changed on the server,
 * so orders, stock, diary posts and group members update without a manual reload.
 */
export function LiveRefresh() {
  const router = useRouter();
  const last = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/version", { cache: "no-store" });
          const { v } = (await res.json()) as { v: string };
          if (last.current && v !== last.current) router.refresh();
          last.current = v;
        } catch {
          // offline / transient error: try again next tick
        }
      }
      timer = setTimeout(tick, INTERVAL_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        tick();
      }
    };

    tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
