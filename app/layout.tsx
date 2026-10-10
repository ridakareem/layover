import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display, Caveat } from "next/font/google";
import "./globals.css";

// Three font roles: body text, a serif, and a handwriting face (used on postcards).
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif-face" });
const hand = Caveat({ subsets: ["latin"], variable: "--font-hand-face" });

export const metadata: Metadata = {
  title: "Travel Souvenirs",
  description: "Photos, stories and postcards from our trips.",
};

// Mobile-first: tell phones to use their real width.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${serif.variable} ${hand.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
