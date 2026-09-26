"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export interface CartProduct {
  id: string;
  name: string;
  unit: string;
  price_per_unit: number;
  farm_id: string;
  farm_name?: string;
  farm_slug?: string;
}

export interface CartLine extends CartProduct {
  quantity: number;
}

interface CartCtx {
  lines: CartLine[];
  count: number;
  total: number;
  farmId: string | null;
  farmName: string | null;
  farmSlug: string | null;
  qtyOf: (productId: string) => number;
  add: (p: CartProduct) => "ok" | "other-farm";
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  replaceWith: (p: CartProduct) => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  hydrated: boolean;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "xtt-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const skipPersist = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLines(parsed);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipPersist.current) { skipPersist.current = false; return; }
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  }, [lines, hydrated]);

  const farmId = lines[0]?.farm_id ?? null;
  const farmName = lines[0]?.farm_name ?? null;
  const farmSlug = lines[0]?.farm_slug ?? null;

  const qtyOf = useCallback((id: string) => lines.find((l) => l.id === id)?.quantity ?? 0, [lines]);

  const add = useCallback<CartCtx["add"]>((p) => {
    if (farmId && farmId !== p.farm_id) return "other-farm";
    setLines((ls) => {
      const i = ls.findIndex((l) => l.id === p.id);
      if (i === -1) return [...ls, { ...p, quantity: 1 }];
      const copy = [...ls];
      copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 };
      return copy;
    });
    return "ok";
  }, [farmId]);

  const replaceWith = useCallback((p: CartProduct) => {
    setLines([{ ...p, quantity: 1 }]);
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((ls) =>
      qty <= 0 ? ls.filter((l) => l.id !== id) : ls.map((l) => (l.id === id ? { ...l, quantity: qty } : l))
    );
  }, []);

  const remove = useCallback((id: string) => setQty(id, 0), [setQty]);
  const clear = useCallback(() => setLines([]), []);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const count = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines]);
  const total = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.price_per_unit, 0), [lines]);

  const value = useMemo<CartCtx>(() => ({
    lines, count, total, farmId, farmName, farmSlug, qtyOf, add, remove, setQty, clear, replaceWith, isOpen, open, close, hydrated,
  }), [lines, count, total, farmId, farmName, farmSlug, qtyOf, add, remove, setQty, clear, replaceWith, isOpen, open, close, hydrated]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
