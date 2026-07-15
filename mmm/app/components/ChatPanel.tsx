"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import { useWizardChat } from "@/components/WizardChatContext";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  text: string;
  proposedConfig?: unknown;
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

export function ChatPanel({ projectId }: { projectId: string }) {
  const { applyConfig } = useWizardChat();
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

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
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
      { role: "assistant", text: data.reply || "(geen tekstuele reactie)", proposedConfig: data.proposedConfig },
    ]);
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 text-sm font-medium text-neutral-700">
        <MessageSquare className="h-4 w-4 text-rose-500" />
        Claude-assistent
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!loaded && <p className="text-sm text-neutral-400">Laden…</p>}
        {loaded && messages.length === 0 && (
          <p className="text-sm text-neutral-400">
            Vraag de architect om de geüploade data te beoordelen en een modelconfiguratie voor
            te stellen.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={m.id ?? i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-sm " +
                (m.role === "user" ? "bg-rose-600 text-white" : "bg-neutral-100 text-neutral-800")
              }
            >
              {m.text}
            </div>
            {m.proposedConfig != null && (
              <div className="mt-1">
                <button
                  onClick={() => applyConfig(m.proposedConfig)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                >
                  <Sparkles className="h-3 w-3" />
                  Voorstel overnemen in de editor
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && <p className="text-sm text-neutral-400">Denkt na…</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs text-rose-600">{error}</p>}

      <div className="flex items-end gap-2 border-t border-neutral-100 p-3">
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
          placeholder="Bijv. 'Kijk naar de geüploade data en stel een configuratie voor.'"
          className="flex-1 resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
        >
          Stuur
        </button>
      </div>
    </div>
  );
}
