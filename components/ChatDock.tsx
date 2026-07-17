"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";

const STORAGE_KEY = "mmm-chat-open";

// De chat-open-state leeft in een context zodat zowel het (fixed) chat-paneel
// als de hoofdcontent hem kunnen lezen — de content reserveert op brede schermen
// rechts ruimte wanneer de chat open is, i.p.v. eronder te verdwijnen.
interface ChatOpenValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  hydrated: boolean;
}
const ChatOpenCtx = createContext<ChatOpenValue | null>(null);

// Breedte (px) vanaf waar het paneel náást de content past i.p.v. eroverheen —
// gelijk aan Tailwind's `xl`. Daaronder is de chat een overlay-drawer, dus daar
// starten we ingeklapt: eerst de content, chat op één tik.
const DESKTOP_MIN = 1280;

export function ChatDockProvider({ children }: { children: React.ReactNode }) {
  // Start ingeklapt (deterministisch voor SSR — geen flits van een volscherm-chat
  // op mobiel). Na mount bepalen we de standaard: open op desktop, dicht daaronder,
  // tenzij de gebruiker eerder zelf een keuze maakte.
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored != null) setOpen(stored === "1");
    else setOpen(window.innerWidth >= DESKTOP_MIN);
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }, [open, hydrated]);

  return <ChatOpenCtx.Provider value={{ open, setOpen, hydrated }}>{children}</ChatOpenCtx.Provider>;
}

function useChatOpen(): ChatOpenValue {
  const ctx = useContext(ChatOpenCtx);
  if (!ctx) throw new Error("Chat components must be used within ChatDockProvider");
  return ctx;
}

// Wrapper om de hoofdcontent: reserveert op xl rechts ruimte voor het open paneel,
// zodat de fixed chat niets overlapt. Op kleiner scherm schuift de chat als
// drawer over de content (met backdrop) en wordt hier geen ruimte gereserveerd.
export function ChatMain({ children }: { children: React.ReactNode }) {
  const { open } = useChatOpen();
  return (
    <div className={`transition-[padding] duration-200 ${open ? "xl:pr-[31rem]" : "xl:pr-14"}`}>{children}</div>
  );
}

// De chatbot: sticky/fixed tegen de rechter-viewportrand, volledige hoogte,
// in- en uitklapbaar. Ingeklapt = een slanke verticale handle tegen de rand.
export function ChatDock({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useChatOpen();

  return (
    <>
      {/* Backdrop — alleen zichtbaar/klikbaar op kleiner scherm wanneer open. */}
      {open && (
        <button
          aria-label="Chat sluiten"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm xl:hidden"
        />
      )}

      {/* Ingeklapte handle, tegen de rechterrand geplakt. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Chat openen"
          className="group fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl border border-r-0 border-border bg-surface px-2.5 py-4 text-fg-muted shadow-panel transition hover:bg-surface-2 hover:text-fg"
        >
          <MessageSquare className="h-5 w-5 text-accent" />
          <span
            className="text-xs font-medium tracking-wide"
            style={{ writingMode: "vertical-rl" }}
          >
            Claude-assistent
          </span>
        </button>
      )}

      {/* Het paneel — schuift vanaf rechts in. */}
      <aside
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-50 flex h-screen w-full max-w-[26rem] flex-col border-l border-border bg-surface shadow-panel transition-transform duration-200 xl:max-w-[30rem] ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium text-fg">
            <MessageSquare className="h-4 w-4 flex-none text-accent" />
            Claude-assistent
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Chat inklappen"
            className="rounded-md p-1 text-fg-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </aside>
    </>
  );
}
