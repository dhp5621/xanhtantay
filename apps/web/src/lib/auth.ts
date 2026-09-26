import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { users, farms } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Demo accounts advertised on the login page. Password for all: DEMO_PASSWORD (default demo123). */
export const DEMO_ACCOUNTS = {
  customer: { email: "lan@gmail.com", name: "Nguyễn Thị Lan" },
  farmer: { email: "bacba@xanhtantay.vn", name: "Bác Ba Nguyễn" },
} as const;

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo123";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email || !credentials?.password) return null;

        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return null;

        // Demo auth: every seeded account shares DEMO_PASSWORD.
        // Production should bcrypt.compare(credentials.password, user.password_hash).
        if (credentials.password !== DEMO_PASSWORD) return null;

        let farmSlug: string | null = null;
        if (user.role === "farmer") {
          const [farm] = await db.select({ slug: farms.slug }).from(farms).where(eq(farms.owner_id, user.id));
          farmSlug = farm?.slug ?? null;
        }
        return { id: user.id, name: user.name, email: user.email, role: user.role, farmSlug, image: user.avatar_url };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as unknown as { role: string }).role;
        token.id = user.id;
        token.farmSlug = (user as unknown as { farmSlug?: string | null }).farmSlug ?? null;
        token.picture = user.image ?? null;
      }
      // useSession().update() after an avatar/name change: re-read from the database.
      if (trigger === "update" && token.id) {
        const [row] = await db.select({ name: users.name, avatar_url: users.avatar_url }).from(users).where(eq(users.id, token.id as string));
        if (row) { token.name = row.name; token.picture = row.avatar_url; }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role: string; id: string }).role = token.role as string;
        (session.user as { id: string }).id = token.id as string;
        (session.user as { farmSlug?: string | null }).farmSlug = (token.farmSlug as string | null) ?? null;
        session.user.image = (token.picture as string | null) ?? null;
        if (token.name) session.user.name = token.name;
      }
      return session;
    },
  },
  pages: { signIn: "/dang-nhap" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
