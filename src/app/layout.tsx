import type { Metadata } from "next";
import { Manrope, Fraunces } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  title: "LendLoop — Borrow what you need. Lend what you don't.",
  description:
    "A neighbourhood tool-lending community where people share useful tools, save money, and build local connections.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${fraunces.variable} h-full scroll-smooth`}>
      <body className="min-h-screen flex flex-col bg-[#F7F5EF] text-[#292D2A] selection:bg-[#DCE7D9] selection:text-[#19372D]">
        {children}
      </body>
    </html>
  );
}
