"use client";

// De chat-spine (linkerkant). Dit is de MOTOR van de wizard: een deterministische
// toestandsmachine die de gebruiker stap voor stap door het hele MMM-proces loodst.
//
// Token-arm ontwerp:
//  - Elke fase-bubbel + elke kaart is vooraf geschreven en kost 0 tokens.
//  - Kolomrollen komen uit de goedkope classificatie die al bij upload draaide.
//  - Het standaard-modelpad is volledig deterministisch.
//  - De architect (Claude) wordt alleen ingeschakeld als de gebruiker vrij typt of
//    expliciet "Laat de AI optimaliseren" kiest. Een voorstel dat terugkomt kan met één
//    klik worden overgenomen (start dezelfde prepare/fit-flow als de kaarten).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, Bot } from "lucide-react";
import { humanizeError } from "@/lib/humanizeMessage";
import { createClient } from "@/lib/supabase/client";
import { derivePhase, isWaitingPhase, type WizardPhase } from "@/lib/wizard/phase";
import { PHASE_SCRIPT } from "@/lib/wizard/script";
import {
  UploadCard,
  RoleMappingCard,
  PrepareReviewCard,
  ContextCard,
  ConfigureCard,
  ReviewCard,
} from "@/components/wizard/cards";
import type { Dataset, Job, ModelRun, SourceFile } from "@/lib/types";

interface Turn {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  proposedRecipe?: unknown;
  proposedConfig?: unknown;
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div className={role === "user" ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          "max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm " +
          (role === "user" ? "bg-accent text-bg" : "border border-border bg-surface-2 text-fg")
        }
      >
        {children}
      </div>
    </div>
  );
}

export function ChatWizard({
  projectId,
  sources,
  dataset,
  jobs,
  runs,
  kpiMargin,
  industry,
  companyDescription,
  contextProvided,
}: {
  projectId: string;
  sources: SourceFile[];
  dataset: Dataset | null;
  jobs: Job[];
  runs: ModelRun[];
  kpiMargin: number | null;
  industry: string | null;
  companyDescription: string | null;
  contextProvided: boolean;
}) {
  const router = useRouter();
  const [skipContext, setSkipContext] = useState(false);
  const phase: WizardPhase = derivePhase({ sources, dataset, jobs, runs, contextProvided, skipContext });
  const source = sources[0] ?? null;
  const latestRun = runs[0] ?? null;
  const latestFailedFit = jobs.find((j) => (j.type === "fit" || j.type === "fit_hierarchical") && j.status === "failed");

  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Realtime: zodra de worker een dataset/job/run bijwerkt, ververst de server-render en
  // schuift de fase vanzelf door — zonder pollen. Eén subscriptie op de drie tabellen die
  // de async voortgang dragen (datasets: samenvoegen; jobs: fase-overgangen; model_runs:
  // resultaat verschijnt). Geen tokens, alleen een server-refresh.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`wizard-${projectId}`);
    for (const table of ["datasets", "jobs", "model_runs"] as const) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "mmm", table, filter: `project_id=eq.${projectId}` },
        () => router.refresh(),
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  // Vangnet: mocht een Realtime-event gemist worden (verbinding weggevallen), pollt de
  // client zachtjes door zolang we nog op de worker wachten — traag, want Realtime is de
  // hoofdroute.
  useEffect(() => {
    if (!isWaitingPhase(phase)) return;
    const id = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(id);
  }, [phase, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy, phase]);

  // Vrij typen → de architect (streaming). Dit is de enige plek in de happy path waar
  // tokens verbruikt worden buiten de twee expliciete AI-momenten.
  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    if (!preset) setInput("");
    setError(null);
    setTurns((prev) => [...prev, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, message: text }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        setError(humanizeError(j.error, "Er ging iets mis — probeer het opnieuw.").text);
        setBusy(false);
        return;
      }
      setTurns((prev) => [...prev, { role: "assistant", text: "", streaming: true }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const updateLast = (patch: Partial<Turn> | ((t: Turn) => Turn)) =>
        setTurns((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = typeof patch === "function" ? patch(last) : { ...last, ...patch };
          return next;
        });
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: { type: string; text?: string; reply?: string; error?: string; proposedConfig?: unknown; proposedRecipe?: unknown };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "delta" && ev.text) {
            updateLast((t) => ({ ...t, text: t.text + ev.text }));
          } else if (ev.type === "done") {
            updateLast({
              text: ev.reply || "(geen tekstuele reactie)",
              streaming: false,
              proposedRecipe: ev.proposedRecipe ?? undefined,
              proposedConfig: ev.proposedConfig ?? undefined,
            });
          } else if (ev.type === "error") {
            setError(humanizeError(ev.error, "Er ging iets mis in het antwoord.").text);
            updateLast({ streaming: false });
          }
        }
      }
      updateLast((t) => ({ ...t, streaming: false }));
    } catch {
      setError("Er ging iets mis met de verbinding.");
    } finally {
      setBusy(false);
    }
  }

  // Een AI-voorstel overnemen: dezelfde flow als de kaarten, zodat de gebruiker in de vaste
  // pijplijn blijft. Een recept start de prepare-job; een config start de fit.
  async function applyProposal(kind: "recipe" | "config", payload: unknown) {
    setBusy(true);
    setError(null);
    try {
      if (kind === "recipe") {
        const { reasoning: _r, ...recipe } = payload as { reasoning?: string } & Record<string, unknown>;
        const res = await fetch("/api/datasets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId, recipe }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      } else {
        const { reasoning: _r, ...rest } = payload as { reasoning?: string } & Record<string, unknown>;
        const config = { ...rest, sample: { draws: 1000, tune: 1000, chains: 4 } };
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId, type: "fit", dataset_id: dataset?.id ?? null, config }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      }
      router.refresh();
    } catch (e) {
      setError(humanizeError((e as Error).message, "Het voorstel overnemen is niet gelukt.").text);
      setBusy(false);
    }
  }

  function askAiToOptimize() {
    inputRef.current?.focus();
    void send(
      "Kijk naar de goedgekeurde dataset en de zakelijke context en stel een geoptimaliseerde " +
        "modelconfiguratie voor (kanaaltypes, adstock/saturatie, trend/seizoen, likelihood).",
    );
  }

  const script = PHASE_SCRIPT[phase];

  // De kaart die bij de huidige fase hoort.
  function renderCard() {
    switch (phase) {
      case "upload":
        return <UploadCard projectId={projectId} source={source} />;
      case "prepare_recipe":
        return source ? <RoleMappingCard projectId={projectId} source={source} /> : null;
      case "prepare_failed":
        return (
          <div className="rounded-xl border border-danger/40 bg-danger-dim p-4">
            <p className="text-sm text-fg">{dataset?.error ?? "Onbekende fout bij het samenvoegen."}</p>
            {source && (
              <div className="mt-3">
                <RoleMappingCard projectId={projectId} source={source} />
              </div>
            )}
          </div>
        );
      case "prepare_review":
        return dataset ? <PrepareReviewCard dataset={dataset} /> : null;
      case "context":
        return (
          <ContextCard
            projectId={projectId}
            industry={industry}
            description={companyDescription}
            kpiMargin={kpiMargin}
            onSkip={() => setSkipContext(true)}
          />
        );
      case "configure":
        return dataset ? <ConfigureCard projectId={projectId} dataset={dataset} onAskAi={askAiToOptimize} /> : null;
      case "fit_failed":
        return (
          <div className="rounded-xl border border-danger/40 bg-danger-dim p-4">
            <p className="text-sm text-fg">{latestFailedFit?.error ?? "Onbekende fout bij de berekening."}</p>
            {dataset && (
              <div className="mt-3">
                <ConfigureCard projectId={projectId} dataset={dataset} onAskAi={askAiToOptimize} />
              </div>
            )}
          </div>
        );
      case "review":
      case "published":
        return latestRun ? <ReviewCard projectId={projectId} run={latestRun} kpiMargin={kpiMargin} /> : null;
      default:
        return null; // prepare_running / fitting: alleen de wacht-bubbel + spinner
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
        {/* De vaste fase-bubbel + kaart. */}
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-accent-dim text-accent">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-3">
            <Bubble role="assistant">{script.message}</Bubble>
            {renderCard()}
            {isWaitingPhase(phase) && (
              <p className="flex items-center gap-2 text-sm text-fg-faint">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> Bezig…
              </p>
            )}
          </div>
        </div>

        {/* Vrij-tekst-gesprek met de architect (escape hatch). */}
        {turns.map((t, i) => (
          <div key={i}>
            <Bubble role={t.role}>{t.text || (t.streaming ? "…" : "")}</Bubble>
            {t.proposedRecipe != null && (
              <button onClick={() => applyProposal("recipe", t.proposedRecipe)} disabled={busy} className="mt-1 inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent-dim px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50">
                <Sparkles className="h-3 w-3" /> Voorstel overnemen & samenvoegen
              </button>
            )}
            {t.proposedConfig != null && (
              <button onClick={() => applyProposal("config", t.proposedConfig)} disabled={busy} className="mt-1 inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent-dim px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50">
                <Sparkles className="h-3 w-3" /> Voorstel overnemen & berekenen
              </button>
            )}
          </div>
        ))}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Vrij-tekst invoer — spaarzaam te gebruiken escape naast de vaste chips/kaarten. */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Iets vragen aan de AI (optioneel — de knoppen hierboven loodsen je vanzelf verder)"
            className="flex-1 resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none transition focus:border-accent/50"
          />
          <button onClick={() => send()} disabled={!input.trim() || busy} className="rounded-lg bg-accent p-2 text-bg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-faint" aria-label="Versturen">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
