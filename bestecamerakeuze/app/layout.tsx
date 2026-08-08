import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "bestecamerakeuze.nl — Vind de beste fotocamera",
    template: "%s | bestecamerakeuze.nl",
  },
  description:
    "Vergelijk de populairste fotocamera's op prijs, specificaties en beoordelingen. Onafhankelijke reviews van systeem- en compactcamera's.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="flex min-h-screen flex-col">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
