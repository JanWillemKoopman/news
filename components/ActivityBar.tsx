"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useWizardChatOptional } from "@/components/WizardChatContext";

// Prominente, altijd-zichtbare "bezig"-indicator: een zwevende pil onderin beeld die
// toont wáár de app mee bezig is en hoe lang al. Elke langlopende actie (AI-voorstel,
// samenvoegen, chatbeurt, verbetercyclus) meldt zich aan via beginActivity() in
// WizardChatContext; lopen er meerdere tegelijk, dan tonen we de recentste + een teller.
// Gecentreerd onderin zodat hij niet botst met de chat-knop (rechtsonder).
export function ActivityBar() {
  const chat = useWizardChatOptional();
  const activities = chat?.activities ?? [];
  const current = activities.length > 0 ? activities[activities.length - 1] : null;

  // Verstreken tijd elke seconde verversen zolang er iets loopt — zo ziet de
  // gebruiker dat er daadwerkelijk iets gebeurt, ook als het minuten duurt.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!current) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [current?.id]);

  if (!current) return null;

  const elapsed = Math.max(0, Math.floor((Date.now() - current.startedAt) / 1000));
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  const time = mm > 0 ? `${mm}:${String(ss).padStart(2, "0")}` : `${ss}s`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-40 w-max max-w-[calc(100vw-7rem)] -translate-x-1/2 sm:bottom-6"
    >
      <div className="flex items-center gap-2.5 rounded-full border border-accent/30 bg-surface px-4 py-2.5 shadow-panel">
        <Loader2 className="h-4 w-4 flex-none animate-spin text-accent" />
        <span className="truncate text-sm text-fg">{current.label}</span>
        <span className="flex-none font-mono text-xs tabular-nums text-fg-muted">{time}</span>
        {activities.length > 1 && (
          <span className="flex-none rounded-full bg-surface-3 px-1.5 py-0.5 text-[11px] text-fg-muted">
            +{activities.length - 1}
          </span>
        )}
      </div>
    </div>
  );
}
