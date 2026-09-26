import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
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

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role: string; id: string }).role = token.role as string;
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: { signIn: "/dang-nhap" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
