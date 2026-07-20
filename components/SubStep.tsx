"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, ChevronDown } from "lucide-react";

// Eén substap binnen een wizard-stap (bv. "2b · Samenvoegen tot één dataset"). Doel:
// elke stap leest als een genummerd recept — de gebruiker ziet in één oogopslag wat er
// al gedaan is, wat nú aan de beurt is en wat er nog komt. Afgeronde en nog-niet-actieve
// substappen klappen in; de actieve (of falende) klapt automatisch open.
//
// Bewust géén remount bij statuswissel: de inhoud blijft in de DOM zodat getypte
// concepten (de rollentabel, een half ingevuld formulier) een status-overgang overleven —
// zelfde principe als PipelineStep.
export type SubStepState = "todo" | "active" | "done" | "attention";

export function SubStep({
  label,
  title,
  state,
  optional = false,
  summary,
  children,
}: {
  label: string; // bv. "2a"
  title: string;
  state: SubStepState;
  optional?: boolean;
  summary?: string; // één regel uitleg/resultaat, zichtbaar naast de titel
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(state === "active" || state === "attention");

  // Wordt deze substap actief (of gaat hij fout), klap dan open zodat de aandacht
  // vanzelf naar de juiste plek gaat. Nooit automatisch dichtklappen: de gebruiker
  // houdt zelf de regie over wat zichtbaar blijft.
  useEffect(() => {
    if (state === "active" || state === "attention") setOpen(true);
  }, [state]);

  const chipBase =
    "flex h-6 w-9 flex-none items-center justify-center rounded-full text-[11px] font-mono font-semibold";
  const chip =
    state === "done" ? (
      <span className={`${chipBase} bg-accent/15 text-accent ring-1 ring-inset ring-accent/40`}>
        <Check className="h-3.5 w-3.5" />
      </span>
    ) : state === "attention" ? (
      <span className={`${chipBase} bg-danger-dim text-danger ring-1 ring-inset ring-danger/50`}>
        <AlertCircle className="h-3.5 w-3.5" />
      </span>
    ) : state === "active" ? (
      <span className={`${chipBase} bg-accent text-bg`}>{label}</span>
    ) : (
      <span className={`${chipBase} text-fg-faint ring-1 ring-inset ring-border`}>{label}</span>
    );

  return (
    <section
      className={`rounded-lg border ${
        state === "attention" ? "border-danger/40" : state === "active" ? "border-border-strong" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        {chip}
        <span className="min-w-0 flex-1">
          <span
            className={`text-sm ${
              state === "attention"
                ? "font-medium text-danger"
                : state === "active"
                  ? "font-medium text-fg"
                  : state === "done"
                    ? "text-fg"
                    : "text-fg-muted"
            }`}
          >
            {title}
            {optional && <span className="ml-2 text-xs font-normal text-fg-faint">optioneel</span>}
          </span>
          {summary && <span className="mt-0.5 block truncate text-xs text-fg-muted">{summary}</span>}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-fg-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={open ? "border-t border-border px-3 py-3" : "hidden"}>{children}</div>
    </section>
  );
}
