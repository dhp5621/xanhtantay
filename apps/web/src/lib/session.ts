import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: "customer" | "farmer";
  farmSlug?: string | null;
  image?: string | null;
};

/** Server-side session helper with typed user. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export { getServerSession };
