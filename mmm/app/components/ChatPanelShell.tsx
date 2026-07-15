import { MessageSquare } from "lucide-react";

// Placeholder for the builder's chat panel. The production Claude API key is intentionally
// separate from the Claude Code build session, so this stays a shell until that key exists.
export function ChatPanelShell() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-dashed border-neutral-300 bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <MessageSquare className="h-4 w-4 text-rose-500" />
        Claude-assistent
      </div>
      <div className="mt-4 flex grow items-center justify-center text-center">
        <p className="max-w-xs text-sm text-neutral-400">
          Het chatpaneel dat de data beoordeelt en de modelconfiguratie voorstelt komt hier —
          zodra de productie-API-key is gekoppeld. Tot dan configureer je de fit handmatig via de
          JSON-editor.
        </p>
      </div>
    </div>
  );
}
