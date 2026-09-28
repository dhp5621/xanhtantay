import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { apiFetch } from "../constants/api";

const INTERVAL_MS = 4000;
const LiveContext = createContext<{ version: string | null }>({ version: null });

/**
 * Polls the server's cheap /api/version change signal while the app is in the foreground.
 * Screens subscribe with useLiveRefresh(load) and re-fetch the moment anything changed on
 * the server, so order tracking, harvest commands and groups update without pulling to refresh.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (AppState.currentState !== "active") return;
      try {
        const { v } = (await apiFetch("/version")) as { v: string };
        if (alive) setVersion(v);
      } catch {
        // offline / transient error: try again next tick
      }
    };
    tick();
    const timer = setInterval(tick, INTERVAL_MS);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") tick();
    });
    return () => {
      alive = false;
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return <LiveContext.Provider value={{ version }}>{children}</LiveContext.Provider>;
}

/** Calls `fn` whenever the server version changes while this screen is focused. */
export function useLiveRefresh(fn: () => unknown) {
  const { version } = useContext(LiveContext);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const prev = useRef<string | null>(version);
  const focused = useRef(false);
  const pending = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (pending.current) {
        pending.current = false;
        fnRef.current();
      }
      return () => {
        focused.current = false;
      };
    }, [])
  );

  useEffect(() => {
    if (version && prev.current && version !== prev.current) {
      if (focused.current) fnRef.current();
      else pending.current = true; // catch up when the screen comes back
    }
    prev.current = version;
  }, [version]);
}
