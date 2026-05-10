import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hisab Pro - Nepal Accounting System",
  description: "Easy like Excel, Powerful like ERP. Nepal's first dual-mode accounting software with VAT/TDS compliance, NFRS standards, and bilingual support.",
  keywords: ["Hisab Pro", "Nepal Accounting", "VAT Nepal", "TDS Nepal", "NFRS", "Double Entry", "Accounting Software", "ERP Nepal"],
  authors: [{ name: "Hisab Pro" }],
  openGraph: {
    title: "Hisab Pro - Nepal Accounting System",
    description: "Easy like Excel, Powerful like ERP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
