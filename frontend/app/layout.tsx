import type { Metadata, Viewport } from "next";
import { Aurora } from "@/components/aurora";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "روشنای باروری | Roshana — Fertility, illuminated by data",
  description:
    "پیش‌بینی پنجره باروری، راهنمای بارداری، کلینیک‌های همکار و صندوق همیاری درمان — با حریم خصوصی کامل.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Roshana", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const noFlash = `(function(){try{var t=localStorage.getItem('roshana.theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');var l=localStorage.getItem('roshana.locale')||'fa';document.documentElement.lang=l;document.documentElement.dir=l==='fa'?'rtl':'ltr';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&family=Inter:wght@300;400;500;700;900&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <Providers>
          <Aurora />
          {children}
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}`,
          }}
        />
      </body>
    </html>
  );
}
