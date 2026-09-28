import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../constants/api";
import type { Me } from "../constants/types";
import { useSession } from "./useSession";

/** What the server resolved for the signed-in person (`GET /users/me`): "Cô Tư" and "cô". */
type Resolved = { userId: string; call: string; pronoun: string };

type AddressContextValue = {
  /** "cô Tư": how the person is called in greetings, lower-case first letter. */
  call: string;
  /** "cô": inside a sentence. */
  pronoun: string;
  /** "Cô": at the start of a sentence. */
  Pronoun: string;
  /** Asks the server again, e.g. after the profile was saved. */
  refresh: () => Promise<void>;
  /** Takes the form of address from a profile that was just loaded or saved, without a request. */
  apply: (me: Pick<Me, "id" | "call_name" | "pronoun"> | null | undefined) => void;
};

/** Until the server has answered, and whenever it cannot be reached, nobody is given a gender. */
const NEUTRAL = "bạn";
const lowerFirst = (s: string) => s.charAt(0).toLocaleLowerCase("vi") + s.slice(1);
const upperFirst = (s: string) => s.charAt(0).toLocaleUpperCase("vi") + s.slice(1);

const AddressContext = createContext<AddressContextValue | null>(null);

/** Loads the form of address once per signed-in user; every screen reads it through `useAddress()`. */
export function AddressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const [resolved, setResolved] = useState<Resolved | null>(null);
  // An answer that arrives after the account changed must not be shown to the next person.
  const current = useRef<string | null>(userId);
  current.current = userId;

  const apply = useCallback((me: Pick<Me, "id" | "call_name" | "pronoun"> | null | undefined) => {
    const pronoun = me?.pronoun?.trim();
    if (!me || me.id !== current.current || !pronoun) return;
    setResolved({ userId: me.id, call: me.call_name?.trim() || pronoun, pronoun });
  }, []);

  const refresh = useCallback(async () => {
    if (!current.current) return;
    // A failed request keeps what is already known; with nothing known the neutral form is used.
    apply(await apiFetch("/users/me").catch(() => null));
  }, [apply]);

  useEffect(() => {
    if (userId) refresh();
    else setResolved(null);
  }, [userId, refresh]);

  const value = useMemo(() => {
    const mine = resolved && resolved.userId === userId ? resolved : null;
    const pronoun = lowerFirst(mine?.pronoun ?? NEUTRAL);
    return { call: lowerFirst(mine?.call ?? NEUTRAL), pronoun, Pronoun: upperFirst(pronoun), refresh, apply };
  }, [resolved, userId, refresh, apply]);

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

/** How to address the signed-in person: `{ call: "cô Tư", pronoun: "cô", Pronoun: "Cô" }`; "bạn" when unknown. */
export function useAddress() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddress must be used within AddressProvider");
  return ctx;
}
