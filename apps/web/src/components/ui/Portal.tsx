"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children at document.body. Needed for fixed-position dialogs and
 * sheets: any ancestor with a transform animation (our entrance animations)
 * becomes their containing block and clips them into the page header.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
