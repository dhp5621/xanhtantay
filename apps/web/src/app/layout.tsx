import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import "./fonts.css";
import "./globals.css";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/components/layout/Providers";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: { default: "Xanh Tận Tay", template: "%s · Xanh Tận Tay" },
  description: "Nông sản tươi từ vườn đến tay bạn",
  applicationName: "Xanh Tận Tay",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6FBF4" },
    { media: "(prefers-color-scheme: dark)", color: "#101410" },
  ],
};

// Applies the stored theme before first paint so there is no light→dark flash.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {/* Fonts are self-hosted (public/fonts); preload the icon subset so icons never flash as text */}
        <link rel="preload" href="/fonts/material-symbols-rounded-subset.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/google-sans-flex-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/google-sans-flex-vietnamese.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers session={session}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
