import { Header } from "@/components/layout/Header";

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
