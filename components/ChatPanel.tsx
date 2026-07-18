"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useWizardChat } from "@/components/WizardChatContext";
import { humanizeError } from "@/lib/humanizeMessage";
import { useOpenChatDock } from "@/components/ChatDock";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  text: string;
  proposedConfig?: unknown;
  proposedRecipe?: unknown;
  // True while this assistant bubble is still receiving streamed deltas.
  streaming?: boolean;
  // Historische beurten: welk voorstel-type deze beurt bevatte (de overnemen-knop bestaat
  // alleen live; in de historie markeren we de beurt zodat hij terug te vinden is).
  pastProposal?: "recept" | "configuratie";
}

// Extracts the plain-text bubble content from a stored Anthropic content-block array
// (text blocks only — tool_use/tool_result blocks don't render as chat text).
function textFromBlocks(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .filter((b): b is { type: string; text: string } => b?.type === "text")
    .map((b) => b.text)
    .join("\n\n");
}

// Detecteert of een opgeslagen assistentbeurt een recept-/configuratievoorstel bevatte.
function proposalFromBlocks(content: unknown): "recept" | "configuratie" | undefined {
  if (!Array.isArray(content)) return undefined;
  for (const b of content as { type?: string; name?: string }[]) {
    if (b?.type !== "tool_use") continue;
    if (b.name === "propose_prepare_recipe") return "recept";
    if (b.name === "propose_model_config") return "configuratie";
  }
  return undefined;
}

// Which quick-actions make sense depends on which step the builder is actually looking
// at — the architect only really has something useful to say about data, the merge
// recipe, the model config, or a fit's results, so offer the 2-3 that fit instead of one
// fixed set of four for every step.
const STEP_QUICK_ACTIONS: Record<string, { label: string; message: string }[]> = {
  data: [
    {
      label: "Stel een samenvoeging voor",
      message: "Kijk naar de geüploade bestanden en stel een samenvoeg-recept voor.",
    },
  ],
  dataprep: [
    {
      label: "Stel een samenvoeging voor",
      message: "Kijk naar de geüploade bestanden en stel een samenvoeg-recept voor.",
    },
    {
      label: "Wat valt op in deze data?",
      message: "Wat valt je op in de geüploade bestanden? Let op gaten, uitschieters of vreemde periodes.",
    },
    {
      label: "Beoordeel de dataset",
      message:
        "Beoordeel de laatste dataset-voorbereiding: leg het kwaliteitsrapport uit en zeg of het klaar is om goed te keuren.",
    },
  ],
  config: [
    {
      label: "Stel een configuratie voor",
      message: "Kijk naar de goedgekeurde dataset en stel een modelconfiguratie voor.",
    },
    {
      label: "Zijn mijn priors realistisch?",
      message:
        "Controleer of mijn huidige configuratie/priors een realistisch KPI-bereik impliceren (prior-predictive) voordat ik een dure berekening start, en adviseer wat ik moet aanpassen.",
    },
  ],
  run: [
    {
      label: "Beoordeel de laatste berekening",
      message: "Beoordeel de laatste berekening: leg de resultaten uit, zeg of het model betrouwbaar is en of het beter kan.",
    },
    {
      label: "Vergelijk met eerdere runs",
      message:
        "Vergelijk de laatste berekening met de eerdere runs van dit project: is hij echt beter geworden (kwaliteitscontrole, R², MAPE, convergentie), wat veroorzaakte het verschil, en welke run zou jij publiceren?",
    },
    {
      label: "Wat is de beste vervolgstap?",
      message:
        "Gegeven de laatste resultaten: wat is de beste vervolgstap — publiceren, nog een gerichte verbetering, of eerst een experiment/kalibratie? Wees concreet.",
    },
  ],
};
const DEFAULT_QUICK_ACTIONS = [
  STEP_QUICK_ACTIONS.data[0],
  STEP_QUICK_ACTIONS.dataprep[2],
  STEP_QUICK_ACTIONS.config[0],
  STEP_QUICK_ACTIONS.run[0],
];

// What the architect currently "sees": rendered as a subtle chip row above the chat so
// the builder knows which context every answer is grounded in (and what's still missing).
interface ChatContextSummary {
  n_sources: number;
  dataset_status: string | null;
  last_fit: { date: string; verdict: string | null } | null;
  n_business_notes: number;
  has_inspection: boolean;
}

function contextChips(ctx: ChatContextSummary): string[] {
  const chips: string[] = [];
  chips.push(ctx.n_sources === 0 ? "nog geen bestanden" : `${ctx.n_sources} bestand(en)`);
  if (ctx.dataset_status) {
    const label: Record<string, string> = {
      approved: "dataset goedgekeurd",
      prepared: "dataset voorbereid",
      preparing: "dataset wordt samengevoegd",
      failed: "samenvoegen mislukt",
      draft: "dataset-concept",
    };
    chips.push(label[ctx.dataset_status] ?? `dataset: ${ctx.dataset_status}`);
  }
  if (ctx.last_fit) {
    chips.push(`laatste berekening ${ctx.last_fit.date}${ctx.last_fit.verdict ? ` (${ctx.last_fit.verdict})` : ""}`);
  }
  if (ctx.n_business_notes > 0) chips.push(`${ctx.n_business_notes} contextfeit(en)`);
  if (ctx.has_inspection) chips.push("diepe inspectie gedaan");
  return chips;
}

export function ChatPanel({ projectId }: { projectId: string }) {
  const { applyConfig, applyRecipe, pendingChatMessage, clearPendingChatMessage, activeStepId, beginActivity, stageRecipe, stageConfig } = useWizardChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<ChatContextSummary | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const openChat = useOpenChatDock();

  useEffect(() => {
    fetch(`/api/chat?project_id=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        const rows = (data.messages ?? []) as { id: string; role: "user" | "assistant"; content: unknown }[];
        setMessages(
          rows
            .map((r) => ({
              id: r.id,
              role: r.role,
              text: textFromBlocks(r.content),
              pastProposal: r.role === "assistant" ? proposalFromBlocks(r.content) : undefined,
            }))
            .filter((m) => m.text.trim().length > 0 || m.pastProposal),
        );
        if (data.context) setContext(data.context as ChatContextSummary);
      })
      .finally(() => setLoaded(true));
  }, [projectId]);

  // Refresh the context chips after each finished turn — a prepare/fit the architect
  // just discussed (or a recorded business fact) should be reflected in what it "sees".
  async function refreshContext() {
    try {
      const r = await fetch(`/api/chat?project_id=${projectId}`);
      const data = await r.json();
      if (data.context) setContext(data.context as ChatContextSummary);
    } catch {
      // Chips zijn informatief; een mislukte refresh mag nooit de chat storen.
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // A result view elsewhere on the page (e.g. a quality-gate warning) can hand a
  // specific, pre-filled question to the architect via sendToChat(). Waits for any
  // in-flight message to finish rather than dropping it.
  useEffect(() => {
    if (pendingChatMessage == null || busy) return;
    clearPendingChatMessage();
    // Een vraag die elders vandaan komt (kwaliteitspoort, joblijst) moet ook zichtbaar
    // zijn: klap de dock open zodat de bouwer het antwoord ziet binnenstromen.
    openChat?.();
    send(pendingChatMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatMessage, busy]);

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    if (!preset) setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setBusy(true);
    // Meld de beurt aan bij de globale ActivityBar: ook met de chat-dock dicht blijft
    // zichtbaar dat de AI aan een antwoord werkt.
    const activity = beginActivity("De AI schrijft een antwoord…");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, message: text }),
        signal: controller.signal,
      });

      // Pre-stream errors (geen toegang, geen API-key, …) come back as plain JSON.
      if (!res.ok || !res.body) {
        setError(humanizeError((await res.json().catch(() => ({}))).error, "Er ging iets mis bij het versturen — probeer het opnieuw.").text);
        return;
      }

      // NDJSON stream: text deltas render live into a growing assistant bubble; the final
      // "done" event carries the proposals (recipe/config) and replaces the streamed text
      // with the canonical reply.
      setMessages((prev) => [...prev, { role: "assistant", text: "", streaming: true }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const updateLast = (patch: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage)) =>
        setMessages((prev) => {
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
          let event: { type: string; text?: string; reply?: string; error?: string; proposedConfig?: unknown; proposedRecipe?: unknown };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "delta" && event.text) {
            updateLast((m) => ({ ...m, text: m.text + event.text }));
          } else if (event.type === "done") {
            updateLast({
              text: event.reply || "(geen tekstuele reactie)",
              streaming: false,
              proposedConfig: event.proposedConfig ?? undefined,
              proposedRecipe: event.proposedRecipe ?? undefined,
            });
            // Zet het voorstel ook klaar bij de betreffende stap zelf, zodat het daar
            // als kaart verschijnt en de gebruiker niet in de chat hoeft te zoeken.
            if (event.proposedRecipe != null) stageRecipe(event.proposedRecipe);
            if (event.proposedConfig != null) stageConfig(event.proposedConfig);
          } else if (event.type === "error") {
            setError(humanizeError(event.error, "Er ging iets mis tijdens het antwoord — probeer het opnieuw.").text);
            updateLast({ streaming: false });
          }
        }
      }
      // Stream ended without a "done" (e.g. verbinding weggevallen): niet blijven hangen
      // op een half bericht — de volledige beurt staat server-side opgeslagen.
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 && m.streaming ? { ...m, streaming: false } : m)),
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // De bouwer klikte "Stop": het antwoord wordt server-side gewoon afgemaakt en
        // opgeslagen; markeer de bubbel als afgebroken.
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 && m.streaming
              ? { ...m, streaming: false, text: `${m.text}\n\n(gestopt — het volledige antwoord staat in de historie na een refresh)` }
              : m,
          ),
        );
      } else {
        setError("Er ging iets mis met de verbinding.");
      }
    } finally {
      activity.end();
      abortRef.current = null;
      setBusy(false);
      void refreshContext();
    }
  }

  return (
    <div className="flex h-full min-h-[28rem] flex-col lg:min-h-0">
      {context && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-1.5">
          <span className="text-[11px] uppercase tracking-wide text-fg-faint">AI ziet:</span>
          {contextChips(context).map((chip) => (
            <span key={chip} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-fg-muted">
              {chip}
            </span>
          ))}
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!loaded && <p className="text-sm text-fg-faint">Laden…</p>}
        {loaded && messages.length === 0 && (
          <p className="text-sm text-fg-muted">
            Vraag de AI om de geüploade bestanden te controleren en samen te voegen,
            om daarna een modelconfiguratie voor te stellen. Na een berekening kun je hem ook
            vragen de resultaten uit te leggen, te beoordelen of te verbeteren.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={m.id ?? i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-sm " +
                (m.role === "user"
                  ? "bg-accent text-bg"
                  : "border border-border bg-surface-2 text-fg")
              }
            >
              {m.text}
            </div>
            {m.pastProposal && m.proposedRecipe == null && m.proposedConfig == null && (
              <p className="mt-0.5 text-[11px] text-fg-faint">
                ⚙ bevatte een {m.pastProposal}-voorstel — vraag de AI het opnieuw voor te stellen als je het alsnog wilt overnemen
              </p>
            )}
            {m.proposedRecipe != null && (
              <div className="mt-1">
                <button
                  onClick={() => applyRecipe(m.proposedRecipe)}
                  className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent-dim px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20"
                >
                  <Sparkles className="h-3 w-3" />
                  Voorstel overnemen in stap 2 (Data voorbereiden)
                </button>
              </div>
            )}
            {m.proposedConfig != null && (
              <div className="mt-1">
                <button
                  onClick={() => applyConfig(m.proposedConfig)}
                  className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent-dim px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20"
                >
                  <Sparkles className="h-3 w-3" />
                  Voorstel overnemen in stap 3 (Model configureren)
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && !messages[messages.length - 1]?.streaming && (
          <p className="text-sm text-fg-faint">Denkt na…</p>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs text-danger">{error}</p>}

      <div className="flex flex-wrap gap-1.5 border-t border-border px-3 pt-2">
        {(activeStepId ? STEP_QUICK_ACTIONS[activeStepId] ?? DEFAULT_QUICK_ACTIONS : DEFAULT_QUICK_ACTIONS).map((action) => (
          <button
            key={action.label}
            onClick={() => send(action.message)}
            disabled={busy}
            className="rounded-full border border-border px-3 py-1 text-xs text-fg-muted transition hover:border-accent/40 hover:bg-accent-dim hover:text-accent disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="Bijv. 'Stel een samenvoeging voor.' of, na een berekening, 'Leg de resultaten uit / kan dit beter?'"
          className="flex-1 resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none transition focus:border-accent/50 focus:shadow-glow-sm"
        />
        {busy ? (
          <button
            onClick={() => abortRef.current?.abort()}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface-2"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => send()}
            disabled={!input.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-faint"
          >
            Stuur
          </button>
        )}
      </div>
    </div>
  );
}
