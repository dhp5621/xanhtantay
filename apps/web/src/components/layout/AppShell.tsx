import { Header } from "./Header";
import { NavBar } from "./NavBar";
import { NavigationProgress } from "./NavigationProgress";
import { Suspense } from "react";

/** One shell for every page so the header never remounts between route groups. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <Suspense fallback={null}><NavigationProgress /></Suspense>
      {children}
      <NavBar />
    </>
  );
}
