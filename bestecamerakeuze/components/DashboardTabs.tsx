"use client";

import { useState } from "react";

/**
 * De tabbalk. Het campagne-tabblad bevat exact het bestaande dashboard — dat is
 * ongewijzigd gebleven. Beide tabbladen blijven gemount (verborgen via CSS) zodat een
 * half getypte vraag of een gespreksgeschiedenis niet verdwijnt bij het heen-en-weer
 * klikken, en zodat de campagnetabel niet opnieuw hoeft te laden.
 */
export default function DashboardTabs({
  campagnes,
  chat,
  kennis,
}: {
  campagnes: React.ReactNode;
  chat: React.ReactNode;
  kennis: React.ReactNode;
}) {
  const [actief, setActief] = useState<"campagnes" | "chat" | "kennis">("campagnes");

  const tabs = [
    { id: "campagnes" as const, label: "Campagnes" },
    { id: "chat" as const, label: "Vraag het je data" },
    { id: "kennis" as const, label: "Kennisbank" },
  ];

  return (
    <div>
      <div role="tablist" aria-label="Weergave" className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const geselecteerd = actief === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={geselecteerd}
              onClick={() => setActief(tab.id)}
              className={`rounded-pill border px-5 py-2 text-sm font-medium transition-colors ${
                geselecteerd
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-card text-ink hover:border-primary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" hidden={actief !== "campagnes"}>
        {campagnes}
      </div>
      <div role="tabpanel" hidden={actief !== "chat"}>
        {chat}
      </div>
      <div role="tabpanel" hidden={actief !== "kennis"}>
        {kennis}
      </div>
    </div>
  );
}
