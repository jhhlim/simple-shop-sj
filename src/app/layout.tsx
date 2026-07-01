import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import { Shell } from "@/components/Shell";
import { SHOP_NAME } from "@/lib/constants";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: `${SHOP_NAME} — Used Goods & Jewelry`,
  description: "Shop our curated used goods and jewelry. Flat $5 shipping — we pack and ship to you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 antialiased">
        <CartProvider>
          <Shell>{children}</Shell>
        </CartProvider>
      </body>
    </html>
  );
}
