"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useWizardChat } from "@/components/WizardChatContext";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  text: string;
  proposedConfig?: unknown;
  proposedRecipe?: unknown;
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

// Which quick-actions make sense depends on which step the builder is actually looking
// at — the architect only really has something useful to say about data, the merge
// recipe, the model config, or a fit's results, so offer the 2-3 that fit instead of one
// fixed set of four for every step.
const STEP_QUICK_ACTIONS: Record<string, { label: string; message: string }[]> = {
  data: [
    {
      label: "Stel een samenvoegrecept voor",
      message: "Kijk naar de geüploade bestanden en stel een samenvoeg-recept voor.",
    },
  ],
  eda: [
    {
      label: "Wat valt op in deze data?",
      message: "Wat valt je op in de geüploade bestanden? Let op gaten, uitschieters of vreemde periodes.",
    },
  ],
  dataprep: [
    {
      label: "Stel een samenvoegrecept voor",
      message: "Kijk naar de geüploade bestanden en stel een samenvoeg-recept voor.",
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
  ],
  fits: [
    {
      label: "Beoordeel de laatste fit",
      message:
        "Leg uit waarom de laatste fit is mislukt of geslaagd, en of de configuratie beter kan.",
    },
  ],
  results: [
    {
      label: "Beoordeel de laatste fit",
      message: "Beoordeel de laatste fit: leg de resultaten uit, zeg of het model betrouwbaar is en of het beter kan.",
    },
  ],
};
const DEFAULT_QUICK_ACTIONS = [
  STEP_QUICK_ACTIONS.data[0],
  STEP_QUICK_ACTIONS.dataprep[1],
  STEP_QUICK_ACTIONS.config[0],
  STEP_QUICK_ACTIONS.results[0],
];

export function ChatPanel({ projectId }: { projectId: string }) {
  const { applyConfig, applyRecipe, pendingChatMessage, clearPendingChatMessage, activeStepId } = useWizardChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/chat?project_id=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        const rows = (data.messages ?? []) as { id: string; role: "user" | "assistant"; content: unknown }[];
        setMessages(
          rows
            .map((r) => ({ id: r.id, role: r.role, text: textFromBlocks(r.content) }))
            .filter((m) => m.text.trim().length > 0),
        );
      })
      .finally(() => setLoaded(true));
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // A result view elsewhere on the page (e.g. a quality-gate warning) can hand a
  // specific, pre-filled question to the architect via sendToChat(). Waits for any
  // in-flight message to finish rather than dropping it.
  useEffect(() => {
    if (pendingChatMessage == null || busy) return;
    clearPendingChatMessage();
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

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, message: text }),
    });
    setBusy(false);

    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Er ging iets mis.");
      return;
    }
    const data = await res.json();
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: data.reply || "(geen tekstuele reactie)",
        proposedConfig: data.proposedConfig,
        proposedRecipe: data.proposedRecipe,
      },
    ]);
  }

  return (
    <div className="flex h-full min-h-[28rem] flex-col lg:min-h-0">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!loaded && <p className="text-sm text-fg-faint">Laden…</p>}
        {loaded && messages.length === 0 && (
          <p className="text-sm text-fg-muted">
            Vraag de architect om de geüploade bestanden te controleren en samen te voegen,
            om daarna een modelconfiguratie voor te stellen. Na een fit kun je hem ook
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
            {m.proposedRecipe != null && (
              <div className="mt-1">
                <button
                  onClick={() => applyRecipe(m.proposedRecipe)}
                  className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent-dim px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20"
                >
                  <Sparkles className="h-3 w-3" />
                  Recept overnemen in de tabel
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
                  Voorstel overnemen in de editor
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && <p className="text-sm text-fg-faint">Denkt na…</p>}
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
          placeholder="Bijv. 'Stel een samenvoegrecept voor.' of, na een fit, 'Leg de resultaten uit / kan dit beter?'"
          className="flex-1 resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none transition focus:border-accent/50 focus:shadow-glow-sm"
        />
        <button
          onClick={() => send()}
          disabled={busy || !input.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-faint"
        >
          Stuur
        </button>
      </div>
    </div>
  );
}
