"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { ThemeProvider } from "./ThemeProvider";
import { SnackbarProvider } from "@/components/ui/Snackbar";
import { CartProvider } from "@/components/cart/CartProvider";
import { LiveRefresh } from "./LiveRefresh";

export function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return (
    // Session is pre-fetched on the server so the header renders its final
    // state on first paint (no login-button → avatar jump), and we do not
    // refetch on every window focus, which caused header re-renders.
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <ThemeProvider>
        <SnackbarProvider>
          <CartProvider>
            <LiveRefresh />
            {children}
          </CartProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
