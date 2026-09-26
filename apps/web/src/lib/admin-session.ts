import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminSecret, verifyAdminToken } from "./admin-auth";

/** Server-side check for admin pages and API routes. */
export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(ADMIN_COOKIE)?.value, adminSecret());
}
