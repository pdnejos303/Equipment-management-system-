// Path: src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { Providers } from "@/components/Providers";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-noto-thai",
  weight: ["400", "600", "700"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "Asset Management — ระบบจัดการอุปกรณ์",
    template: "%s | Asset Management",
  },
  description:
    "ระบบจัดการอุปกรณ์สำหรับธุรกิจขนาดเล็ก · Equipment management system for small business · 中小企業向け機器管理システム",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf8f5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${notoSansThai.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-flash: apply saved theme + mode before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('equip-theme-v2')||'snow';var d=document.documentElement;d.setAttribute('data-theme',t);var l=['snow','latte','sakura','arctic'];var m=l.indexOf(t)>=0?'light':'dark';d.setAttribute('data-mode',m);d.style.colorScheme=m;var s=localStorage.getItem('equip-shape-v2')||'square';d.setAttribute('data-shape',s)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased bg-background text-[var(--text-default)]">
        <NextTopLoader
          color="#f59e0b"
          height={2}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 8px #f59e0b, 0 0 4px #f59e0baa"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

