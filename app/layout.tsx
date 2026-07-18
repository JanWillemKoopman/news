import type { Metadata } from "next";
import "./globals.css";

// Systeemfonts (SF Pro op Apple-apparaten, Segoe/Roboto elders) via de CSS-variabelen in
// globals.css — geen webfont-download, en precies de apple.com-achtige look & feel.

export const metadata: Metadata = {
  title: "MMM Wizard",
  description: "Bouw een Bayesiaans media mix model en publiceer een klantdashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="font-sans">{children}</body>
    </html>
  );
}
