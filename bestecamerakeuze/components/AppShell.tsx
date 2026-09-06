"use client";

import { useState } from "react";
import FooterNote from "@/components/FooterNote";
import PageHeader from "@/components/PageHeader";
import Sidebar, { type DashboardView } from "@/components/Sidebar";

type Props = {
  gebruikerEmail: string | null;
  liveCount: number;
  updatedAt: string;
  campagnes: React.ReactNode;
  chat: React.ReactNode;
  kennis: React.ReactNode;
  kosten: React.ReactNode;
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
  kosten: {
    title: "Kosten",
    subtitle: "Claude API-uitgaven per dag.",
  },
};

/**
 * De navigatieschil rond het hele dashboard: sidebar links, page header + content
 * rechts. Alle vier de panelen blijven gemount (verborgen via CSS) zodat een half
 * getypte vraag of een gespreksgeschiedenis niet verdwijnt bij het wisselen van tab, en
 * zodat de campagnetabel niet opnieuw hoeft te laden.
 *
 * Uitsluitend voor desktop gebouwd (zie CLAUDE.md) — de sidebar staat altijd vast, geen
 * mobiel menu nodig.
 */
export default function AppShell({
  gebruikerEmail,
  liveCount,
  updatedAt,
  campagnes,
  chat,
  kennis,
  kosten,
}: Props) {
  const [actief, setActief] = useState<DashboardView>("campagnes");
  const { title, subtitle } = TITLES[actief];

  return (
    <div className="flex min-h-screen bg-page">
      <div className="sticky top-0 h-screen">
        <Sidebar actief={actief} onNavigate={setActief} gebruikerEmail={gebruikerEmail} />
      </div>

      <main className="min-w-0 flex-1 px-8 py-6">
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
        <div className="mt-6" role="tabpanel" hidden={actief !== "kosten"}>
          {kosten}
        </div>

        <FooterNote />
      </main>
    </div>
  );
}
