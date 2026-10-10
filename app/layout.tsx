import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display, Caveat, Dancing_Script } from "next/font/google";
import "./globals.css";

// Font roles: body text, plus the three postcard fonts (handwriting, script, serif).
// The postcard canvas reads these CSS variables, see lib/postcard.ts.
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif-face" });
const hand = Caveat({ subsets: ["latin"], variable: "--font-hand-face" });
const script = Dancing_Script({ subsets: ["latin"], variable: "--font-script-face" });

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
    <html lang="en" className={`${body.variable} ${serif.variable} ${hand.variable} ${script.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
