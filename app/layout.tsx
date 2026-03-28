import { IBM_Plex_Mono } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

import { ToasterProvider } from "@/components/providers/toaster-provider";

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ALTE",
  description: "Adaptive Learning & Test Engine",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={mono.variable}>
      <body
        className="min-h-screen bg-background text-foreground"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
