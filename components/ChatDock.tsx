"use client";

import { useEffect, useState } from "react";
import { MessageSquare, PanelRightClose, PanelRightOpen } from "lucide-react";

const STORAGE_KEY = "mmm-chat-open";

// Owns the chat's card chrome, header and collapse/expand state — separate from
// ChatPanel (the conversation itself) so the width/visibility behavior lives in one
// place. Collapsed: a slim strip on desktop (pipeline reclaims the width) / a compact
// bar on mobile. Expanded: a genuinely wide, prominent panel — not a squeezed sidebar —
// because a chat you can barely read isn't a chat you'll actually use.
export function ChatDock({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored != null) setOpen(stored === "1");
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }, [open, hydrated]);

  return (
    <div
      className={`flex flex-none flex-col rounded-xl border border-neutral-200 bg-white transition-[width] duration-200 lg:sticky lg:top-8 lg:h-[calc(100vh-8rem)] ${
        open ? "w-full lg:w-[26rem] xl:w-[32rem]" : "w-full lg:w-14"
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center rounded-t-xl border-b border-neutral-100 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 ${
          open ? "justify-between gap-2" : "justify-center gap-2 lg:flex-col lg:gap-1.5"
        }`}
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 flex-none text-rose-500" />
          <span className={open ? "" : "lg:hidden"}>Claude-assistent</span>
        </span>
        {open ? (
          <PanelRightClose className="h-4 w-4 flex-none text-neutral-400" />
        ) : (
          <PanelRightOpen className="h-4 w-4 flex-none text-neutral-400" />
        )}
      </button>
      <div className={open ? "min-h-0 flex-1" : "hidden"}>{children}</div>
    </div>
  );
}
