import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Farmers use the farmer app only. The one customer-side page they may open is
 * their own farm page ("xem vườn của tôi như khách"), plus the shared account page.
 */
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== "farmer") return NextResponse.next();

  const { pathname } = req.nextUrl;
  const ownFarm = token.farmSlug ? `/farms/${token.farmSlug}` : null;
  const allowed =
    pathname.startsWith("/farmer") ||
    pathname === "/tai-khoan" ||
    pathname === "/dang-nhap" ||
    (ownFarm !== null && pathname === ownFarm);

  if (allowed) return NextResponse.next();
  return NextResponse.redirect(new URL("/farmer", req.url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
