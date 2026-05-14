import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { themeBootScript } from "@/components/theme-toggle";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Betri CoachMe",
  description: "Endurance coaching, rebuilt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
