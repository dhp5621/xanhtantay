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
  farm_location?: string;
}

export interface CartLine extends CartProduct {
  quantity: number;
}

export interface CartGroup { farm_id: string; farm_name: string; farm_slug?: string; farm_location?: string; lines: CartLine[]; subtotal: number; count: number }

interface CartCtx {
  lines: CartLine[];
  groups: CartGroup[];
  count: number;
  total: number;
  qtyOf: (productId: string) => number;
  add: (p: CartProduct) => "ok";
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  clearFarm: (farmId: string) => void;
  linesOf: (farmId: string) => CartLine[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  hydrated: boolean;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "xtt-cart-v2";

/** Multi-farm cart: lines from several farms live together and check out as one order per farm. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const skipPersist = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem("xtt-cart-v1");
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

  const qtyOf = useCallback((id: string) => lines.find((l) => l.id === id)?.quantity ?? 0, [lines]);

  const add = useCallback<CartCtx["add"]>((p) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.id === p.id);
      if (i === -1) return [...ls, { ...p, quantity: 1 }];
      const copy = [...ls];
      copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 };
      return copy;
    });
    return "ok";
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.id !== id) : ls.map((l) => (l.id === id ? { ...l, quantity: qty } : l))));
  }, []);

  const remove = useCallback((id: string) => setQty(id, 0), [setQty]);
  const clear = useCallback(() => setLines([]), []);
  const clearFarm = useCallback((farmId: string) => setLines((ls) => ls.filter((l) => l.farm_id !== farmId)), []);
  const linesOf = useCallback((farmId: string) => lines.filter((l) => l.farm_id === farmId), [lines]);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const groups = useMemo<CartGroup[]>(() => {
    const map = new Map<string, CartGroup>();
    for (const l of lines) {
      const g = map.get(l.farm_id) ?? { farm_id: l.farm_id, farm_name: l.farm_name ?? "Vườn rau", farm_slug: l.farm_slug, farm_location: l.farm_location, lines: [], subtotal: 0, count: 0 };
      g.lines.push(l); g.subtotal += l.quantity * l.price_per_unit; g.count += l.quantity;
      map.set(l.farm_id, g);
    }
    return Array.from(map.values());
  }, [lines]);

  const count = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines]);
  const total = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.price_per_unit, 0), [lines]);

  const value = useMemo<CartCtx>(() => ({ lines, groups, count, total, qtyOf, add, remove, setQty, clear, clearFarm, linesOf, isOpen, open, close, hydrated }),
    [lines, groups, count, total, qtyOf, add, remove, setQty, clear, clearFarm, linesOf, isOpen, open, close, hydrated]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
