import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/vazirmatn";
import "@fontsource-variable/inter";
import { Aurora } from "@/components/aurora";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "روشنای باروری | Roshana — Fertility, illuminated by data",
  description:
    "پیش‌بینی پنجره باروری، راهنمای بارداری، کلینیک‌های همکار و صندوق همیاری درمان — با احترام به حریم خصوصی.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Roshana", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0710" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
};

// Runs before first paint so the saved theme and direction apply without a flash.
const noFlash = `(function(){try{var t=localStorage.getItem('roshana.theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');var l=localStorage.getItem('roshana.locale')==='en'?'en':'fa';document.documentElement.lang=l;document.documentElement.dir=l==='fa'?'rtl':'ltr';}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The nonce is minted per request in middleware.ts; reading it makes pages render dynamically,
  // which is what lets the CSP forbid every script that does not carry it.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <Providers>
          <Aurora />
          {children}
        </Providers>
      </body>
    </html>
  );
}
