import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "chamou.delivery — Sistema para Restaurantes",
    template: "%s | chamou.delivery",
  },
  description:
    "ERP moderno para restaurantes. Cardápio digital, pedidos, cozinha, gestão financeira e muito mais.",
  keywords: ["restaurante", "sistema", "pedidos", "cardápio digital", "erp"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "chamou.delivery",
  },
};

export const viewport: Viewport = {
  themeColor: "#f83b3b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={inter.variable}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
