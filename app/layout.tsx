import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MMM Wizard",
  description: "Bouw een Bayesiaans media mix model en publiceer een klantdashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
