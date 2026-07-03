import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import { Shell } from "@/components/Shell";
import { SHOP_NAME } from "@/lib/constants";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: `${SHOP_NAME} — Quality Fashion, Toys & Unique Finds`,
  description:
    "Family-owned California resale shop. Carefully inspected clothing, shoes, bags, jewelry, toys & collectibles. Flat $5 shipping.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 antialiased">
        <AuthProvider>
          <CartProvider>
            <Shell>{children}</Shell>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
