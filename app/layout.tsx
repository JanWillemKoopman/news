import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Inter voor UI/tekst, JetBrains Mono voor data/getallen/code — self-hosted via
// next/font (geen externe CDN-calls). Beide als CSS-var, uitgelezen in tailwind.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "MMM Wizard",
  description: "Bouw een Bayesiaans media mix model en publiceer een klantdashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
