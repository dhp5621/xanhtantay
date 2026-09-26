"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";

type Kind = "info" | "success" | "error";
interface Snack {
  id: number;
  message: string;
  kind: Kind;
  action?: { label: string; onClick: () => void };
  closing?: boolean;
}

interface SnackbarCtx {
  show: (message: string, opts?: { kind?: Kind; action?: Snack["action"]; duration?: number }) => void;
}

const Ctx = createContext<SnackbarCtx>({ show: () => {} });

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setSnacks((s) => s.map((x) => (x.id === id ? { ...x, closing: true } : x)));
    setTimeout(() => setSnacks((s) => s.filter((x) => x.id !== id)), 300);
  }, []);

  const show = useCallback<SnackbarCtx["show"]>((message, opts) => {
    const id = ++idRef.current;
    setSnacks((s) => [...s.slice(-2), { id, message, kind: opts?.kind ?? "info", action: opts?.action }]);
    setTimeout(() => dismiss(id), opts?.duration ?? 4000);
  }, [dismiss]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="m3-snackbar-host" aria-live="polite">
        {snacks.map((s) => (
          <div key={s.id} className={`m3-snackbar ${s.kind} ${s.closing ? "closing" : ""}`} role="status">
            <Icon name={s.kind === "success" ? "check_circle" : s.kind === "error" ? "error" : "info"} filled />
            <span style={{ flex: 1 }}>{s.message}</span>
            {s.action && (
              <button
                className="m3-snackbar-action"
                onClick={() => { s.action?.onClick(); dismiss(s.id); }}
              >
                {s.action.label}
              </button>
            )}
            <button className="m3-icon-btn sm" onClick={() => dismiss(s.id)} aria-label="Đóng" style={{ color: "inherit" }}>
              <Icon name="close" size={18} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useSnackbar = () => useContext(Ctx);
