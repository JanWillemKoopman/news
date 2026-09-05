"use client";

import { useState } from "react";
import FooterNote from "@/components/FooterNote";
import PageHeader from "@/components/PageHeader";
import Sidebar, { type DashboardView } from "@/components/Sidebar";
import { IconMenu } from "@/components/icons";

type Props = {
  gebruikerEmail: string | null;
  liveCount: number;
  updatedAt: string;
  campagnes: React.ReactNode;
  chat: React.ReactNode;
  kennis: React.ReactNode;
};

const TITLES: Record<DashboardView, { title: string; subtitle: string }> = {
  campagnes: {
    title: "Campagnes",
    subtitle: "In één overzicht de prestaties van al je actieve campagnes.",
  },
  chat: {
    title: "Vraag het je data",
    subtitle: "Stel een vraag in gewone taal en krijg antwoord uit je eigen data.",
  },
  kennis: {
    title: "Kennisbank",
    subtitle: "Alles wat je moet weten om campagnes en data goed te interpreteren.",
  },
};

/**
 * De navigatieschil rond het hele dashboard: sidebar links, page header + content
 * rechts. Alle drie de panelen blijven gemount (verborgen via CSS) zodat een half
 * getypte vraag of een gespreksgeschiedenis niet verdwijnt bij het wisselen van tab, en
 * zodat de campagnetabel niet opnieuw hoeft te laden.
 *
 * Onder de lg-breakpoint schuift de sidebar weg (de campagne-tabel blijft zelf
 * horizontaal scrollbaar in plaats van kolommen te laten inkrimpen).
 */
export default function AppShell({ gebruikerEmail, liveCount, updatedAt, campagnes, chat, kennis }: Props) {
  const [actief, setActief] = useState<DashboardView>("campagnes");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { title, subtitle } = TITLES[actief];

  function navigate(view: DashboardView) {
    setActief(view);
    setMobileMenuOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-page">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Navigatie sluiten"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar actief={actief} onNavigate={navigate} gebruikerEmail={gebruikerEmail} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-line bg-card px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Navigatie openen"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-line text-ink-muted"
          >
            <IconMenu className="h-4 w-4" />
          </button>
          <span className="font-sans-w7 text-sm font-bold tracking-[0.08em] text-ink">UDENHOUT</span>
        </div>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <PageHeader
            title={title}
            subtitle={subtitle}
            meta={actief === "campagnes" ? { liveCount, updatedAt } : undefined}
          />

          <div className="mt-6" role="tabpanel" hidden={actief !== "campagnes"}>
            {campagnes}
          </div>
          <div className="mt-6" role="tabpanel" hidden={actief !== "chat"}>
            {chat}
          </div>
          <div className="mt-6" role="tabpanel" hidden={actief !== "kennis"}>
            {kennis}
          </div>

          <FooterNote />
        </main>
      </div>
    </div>
  );
}
