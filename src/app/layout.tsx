import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${ibmPlexMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
