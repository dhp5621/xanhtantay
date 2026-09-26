import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { DEMO_PASSWORD } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Đăng nhập" };

export default async function DangNhapPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  // Already signed in → never show the login form again.
  if (user) redirect(next?.startsWith("/") ? next : user.role === "farmer" ? "/farmer" : "/");

  return <LoginForm next={next} demoPassword={DEMO_PASSWORD} />;
}
