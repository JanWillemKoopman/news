"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useWizardChatOptional } from "@/components/WizardChatContext";
import type { StepMeta, StepStatus } from "@/lib/pipelineStatus";

interface PipelineCtxValue {
  steps: StepMeta[];
  activeId: string;
  goTo: (id: string) => void;
}

const PipelineCtx = createContext<PipelineCtxValue | null>(null);

function usePipeline(): PipelineCtxValue {
  const ctx = useContext(PipelineCtx);
  if (!ctx) throw new Error("Pipeline components must be used within PipelineShell");
  return ctx;
}

// De stap waarop we defaulten als de URL nog geen ?step= heeft: eerst iets dat
// aandacht vraagt, anders de "actieve" stap, anders de eerste.
function defaultStepId(steps: StepMeta[]): string {
  return (
    steps.find((s) => s.status === "attention")?.id ??
    steps.find((s) => s.status === "active")?.id ??
    steps[0].id
  );
}

export function PipelineShell({ steps, children }: { steps: StepMeta[]; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chat = useWizardChatOptional();

  const fallback = useMemo(() => defaultStepId(steps), [steps]);
  const requested = searchParams.get("step");
  // Alleen een geldige stap-id uit de URL accepteren; anders de default.
  const activeId = steps.some((s) => s.id === requested) ? (requested as string) : fallback;

  // Houd de chat context-bewust van de zichtbare stap.
  useEffect(() => {
    chat?.setActiveStepId(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  function goTo(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", id);
    // replace i.p.v. push: elke stapwissel is geen aparte history-entry-per-klik-lawine,
    // maar de URL blijft deelbaar en browser terug/vooruit werkt tussen navigaties.
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    document.getElementById("wizard-step-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const activeIndex = steps.findIndex((s) => s.id === activeId);
  const prev = activeIndex > 0 ? steps[activeIndex - 1] : null;
  const next = activeIndex < steps.length - 1 ? steps[activeIndex + 1] : null;

  const touchStart = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, target: e.target };
  }

  // Swipe left/right to move a step forward/back — touch-only (a mouse never fires touch
  // events), so this doesn't interfere with desktop. A swipe must be clearly horizontal and
  // past a real threshold, and is ignored entirely if it started inside a horizontally
  // scrollable element (a wide table, the correlation matrix, the stepper nav itself) so
  // that normal inner-scroll gestures aren't hijacked into a step change.
  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !stepsRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const SWIPE_THRESHOLD = 70;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (isWithinHorizontalScroller(start.target, stepsRef.current)) return;
    if (dx < 0 && next) goTo(next.id);
    else if (dx > 0 && prev) goTo(prev.id);
  }

  return (
    <PipelineCtx.Provider value={{ steps, activeId, goTo }}>
      <div id="wizard-step-top" className="scroll-mt-24" />
      <WizardStepper />
      <div ref={stepsRef} className="mt-5 space-y-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {children}
      </div>
      <StepNav prev={prev} next={next} onGo={goTo} />
    </PipelineCtx.Provider>
  );
}

// Walks up from a touch's start target to `boundary`, looking for an ancestor that
// actually scrolls horizontally — used to let inner horizontal scrollers (wide tables,
// the correlation matrix, charts) keep their native touch behavior instead of triggering
// a step swipe.
function isWithinHorizontalScroller(node: EventTarget | null, boundary: HTMLElement): boolean {
  let el = node instanceof Element ? node : null;
  while (el && el !== boundary) {
    const style = window.getComputedStyle(el);
    const scrollable = (style.overflowX === "auto" || style.overflowX === "scroll") && el.scrollWidth > el.clientWidth;
    if (scrollable) return true;
    el = el.parentElement;
  }
  return false;
}

function StepDot({ status, number }: { status: StepStatus; number: number }) {
  const base = "flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-mono font-semibold";
  if (status === "done") {
    return (
      <span className={`${base} bg-accent/15 text-accent ring-1 ring-inset ring-accent/40`}>
        <Check className="h-4 w-4" />
      </span>
    );
  }
  if (status === "attention") {
    return (
      <span className={`${base} bg-danger-dim text-danger ring-1 ring-inset ring-danger/50`}>
        <AlertCircle className="h-4 w-4" />
      </span>
    );
  }
  if (status === "active") {
    return <span className={`${base} bg-accent text-bg shadow-glow-sm`}>{number}</span>;
  }
  return (
    <span
      className={`${base} ring-1 ring-inset ${
        status === "locked" ? "text-fg-faint ring-border" : "text-fg-muted ring-border-strong"
      }`}
    >
      {number}
    </span>
  );
}

function WizardStepper() {
  const { steps, activeId, goTo } = usePipeline();
  const navRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Op tablet/mobiel past de stepper niet in beeld en scrollt hij horizontaal:
  // centreer de actieve chip zodat je altijd ziet waar je bent — zonder de pagina
  // verticaal te laten springen (daarom scrollBy op de nav zelf, geen scrollIntoView).
  useEffect(() => {
    const nav = navRef.current;
    const btn = activeRef.current;
    if (!nav || !btn) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const delta = btnRect.left - navRect.left - (nav.clientWidth / 2 - btn.clientWidth / 2);
    nav.scrollBy({ left: delta, behavior: "smooth" });
  }, [activeId]);

  return (
    <nav
      ref={navRef}
      aria-label="Stappen"
      // Op mobiel is de header niet sticky (zie TopBar), dus deze nav is daar het eerste
      // dat blijft plakken — vanaf sm schuift hij onder de wél-sticky header.
      className="sticky top-0 z-20 -mx-1 overflow-x-auto rounded-[10px] border border-border bg-surface/80 px-1 py-1.5 backdrop-blur sm:top-[3.25rem]"
    >
      <ol className="flex min-w-max items-center gap-1">
        {steps.map((s, i) => {
          const isActive = s.id === activeId;
          return (
            <li key={s.id} className="flex items-center">
              <button
                ref={isActive ? activeRef : undefined}
                onClick={() => goTo(s.id)}
                aria-current={isActive ? "step" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition ${
                  isActive ? "bg-surface-3" : "hover:bg-surface-2"
                }`}
              >
                <StepDot status={s.status} number={i + 1} />
                <span className="flex flex-col">
                  <span
                    className={`whitespace-nowrap text-sm ${
                      isActive
                        ? "font-medium text-fg"
                        : s.status === "attention"
                          ? "text-danger"
                          : s.status === "locked"
                            ? "text-fg-faint"
                            : "text-fg-muted"
                    }`}
                  >
                    {s.title}
                  </span>
                </span>
              </button>
              {i < steps.length - 1 && <span className="mx-0.5 h-px w-4 flex-none bg-border" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepNav({
  prev,
  next,
  onGo,
}: {
  prev: StepMeta | null;
  next: StepMeta | null;
  onGo: (id: string) => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
      {prev ? (
        <button
          onClick={() => onGo(prev.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-fg-muted transition hover:border-border-strong hover:text-fg"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{prev.title}</span>
          <span className="sm:hidden">Vorige</span>
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button
          onClick={() => onGo(next.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg transition hover:border-border-strong hover:bg-surface-3"
        >
          <span className="hidden sm:inline">{next.title}</span>
          <span className="sm:hidden">Volgende</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function PipelineStep({
  id,
  number,
  children,
}: {
  id: string;
  number: number;
  children: React.ReactNode;
}) {
  const { steps, activeId } = usePipeline();
  const meta = steps.find((s) => s.id === id);
  if (!meta) throw new Error(`Unknown pipeline step id: ${id}`);
  const active = id === activeId;

  return (
    // Alle stappen blijven in de DOM (hidden wanneer inactief) zodat getypte
    // drafts — een geconfigureerde JSON, een bewerkte rollen-tabel — een
    // stapwissel overleven. Alleen de actieve stap is zichtbaar.
    <section id={`step-${id}`} className={active ? "" : "hidden"} aria-hidden={!active}>
      <div className="rounded-[10px] border border-border bg-surface shadow-panel">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <StepDot status={meta.status} number={number} />
          <div className="min-w-0 flex-1">
            <h2
              className={`text-sm font-semibold ${meta.status === "attention" ? "text-danger" : "text-fg"}`}
            >
              {meta.title}
            </h2>
            {meta.summary && <p className="mt-0.5 truncate text-xs text-fg-muted">{meta.summary}</p>}
          </div>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </section>
  );
}
