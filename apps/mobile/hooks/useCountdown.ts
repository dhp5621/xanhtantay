import { useEffect, useState } from "react";

/** Milliseconds left until `iso` (0 once passed), re-evaluated every second while mounted. */
export function useCountdown(iso: string | null | undefined) {
  const target = iso ? new Date(iso).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(target)) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  return Number.isNaN(target) ? 0 : Math.max(0, target - now);
}
