import type { Metadata, Viewport } from "next";
import { Fraunces, Mulish } from "next/font/google";
import "./globals.css";

// Warme, redactionele typografie in de geest van Starbucks — geen klinische tech-fonts.
// Mulish: een zachte, humanistische sans als uiterst leesbare broodtekst en UI.
// Fraunces: een ambachtelijke "old style" display-serif met optische groottes, voor
// sterke, warme koppen. Beide worden bij de build self-hosted (geen runtime-CDN).
const sans = Mulish({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MMM Wizard",
  description: "Bouw een Bayesiaans media mix model en publiceer een klantdashboard.",
};

// maximumScale voorkomt dat iOS Safari bij focus op een invoerveld automatisch inzoomt
// (en ingezoomd blijft, waardoor de pagina niet meer op volledige breedte staat).
// Handmatig knijp-zoomen blijft op iOS gewoon werken — Safari negeert deze limiet
// bewust voor gebruikersgebaren, dus toegankelijkheid blijft intact.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
