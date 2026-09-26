import { Header } from "./Header";
import { NavBar } from "./NavBar";
import { CartSheet } from "@/components/cart/CartSheet";

/** One shell for every page so the header never remounts between route groups. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <NavBar />
      <CartSheet />
    </>
  );
}
