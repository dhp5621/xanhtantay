import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-session";
import { adminCredentialsConfigured } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata = { title: "Đăng nhập quản trị" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await isAdmin()) redirect(next?.startsWith("/admin") ? next : "/admin");
  return <AdminLoginForm next={next} configured={adminCredentialsConfigured()} />;
}
