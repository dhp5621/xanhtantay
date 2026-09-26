import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function FarmerLayout({ children }: { children: React.ReactNode }) {
  // Guard the whole farmer area once instead of per page (several pages had no role check).
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?next=/farmer");
  if (user.role !== "farmer") redirect("/");

  return <main className="m3-page max-w-6xl mx-auto px-4 py-6 md:py-8">{children}</main>;
}
