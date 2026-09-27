import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export interface CartGroup {
  farm_id: string;
  farm_name: string;
  farm_slug?: string;
  farm_location?: string;
  lines: CartLine[];
  subtotal: number;
  count: number;
}

interface CartCtx {
  lines: CartLine[];
  groups: CartGroup[];
  count: number;
  total: number;
  qtyOf: (productId: string) => number;
  add: (p: CartProduct) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  clearFarm: (farmId: string) => void;
}

const Ctx = createContext<CartCtx | null>(null);
const CART_STORAGE_KEY = "xtt_cart_lines";

/**
 * Mirrors apps/web/src/components/cart/CartProvider.tsx: multi-farm cart, one order per farm at
 * checkout. Persisted to AsyncStorage so the cart survives an app restart, matching a real app's
 * behavior instead of the "browser tab" in-memory-only behavior the original port had.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (raw) setLines(JSON.parse(raw));
      } catch {
        // ignore corrupt storage
      } finally {
        hydrated.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return; // don't clobber storage with the initial empty state
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines)).catch(() => {});
  }, [lines]);

  const qtyOf = useCallback((id: string) => lines.find((l) => l.id === id)?.quantity ?? 0, [lines]);

  const add = useCallback((p: CartProduct) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.id === p.id);
      if (i === -1) return [...ls, { ...p, quantity: 1 }];
      const copy = [...ls];
      copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 };
      return copy;
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.id !== id) : ls.map((l) => (l.id === id ? { ...l, quantity: qty } : l))));
  }, []);

  const remove = useCallback((id: string) => setQty(id, 0), [setQty]);
  const clear = useCallback(() => setLines([]), []);
  const clearFarm = useCallback((farmId: string) => setLines((ls) => ls.filter((l) => l.farm_id !== farmId)), []);

  const groups = useMemo<CartGroup[]>(() => {
    const map = new Map<string, CartGroup>();
    for (const l of lines) {
      const g = map.get(l.farm_id) ?? {
        farm_id: l.farm_id,
        farm_name: l.farm_name ?? "Vườn rau",
        farm_slug: l.farm_slug,
        farm_location: l.farm_location,
        lines: [],
        subtotal: 0,
        count: 0,
      };
      g.lines.push(l);
      g.subtotal += l.quantity * l.price_per_unit;
      g.count += l.quantity;
      map.set(l.farm_id, g);
    }
    return Array.from(map.values());
  }, [lines]);

  const count = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines]);
  const total = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.price_per_unit, 0), [lines]);

  const value = useMemo<CartCtx>(
    () => ({ lines, groups, count, total, qtyOf, add, remove, setQty, clear, clearFarm }),
    [lines, groups, count, total, qtyOf, add, remove, setQty, clear, clearFarm]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
