"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { AlertCircle, Check, ChevronDown } from "lucide-react";
import type { StepMeta, StepStatus } from "@/lib/pipelineStatus";

interface PipelineCtxValue {
  steps: StepMeta[];
  openIds: string[];
  toggle: (id: string) => void;
  openAndScroll: (id: string) => void;
}

const PipelineCtx = createContext<PipelineCtxValue | null>(null);

function usePipeline(): PipelineCtxValue {
  const ctx = useContext(PipelineCtx);
  if (!ctx) throw new Error("Pipeline components must be used within PipelineShell");
  return ctx;
}

export function PipelineShell({ steps, children }: { steps: StepMeta[]; children: React.ReactNode }) {
  const initialOpen = useMemo(
    () => steps.filter((s) => s.status === "active" || s.status === "attention").map((s) => s.id),
    // Only ever re-derive on mount — once the builder starts opening/closing sections
    // themselves, a server refresh (e.g. Realtime status change) shouldn't yank a
    // section shut or open underneath them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [openIds, setOpenIds] = useState<string[]>(initialOpen);

  function toggle(id: string) {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function openAndScroll(id: string) {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    document.getElementById(`step-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <PipelineCtx.Provider value={{ steps, openIds, toggle, openAndScroll }}>
      <MobileStepIndicator />
      <div className="lg:grid lg:grid-cols-[13rem_1fr] lg:items-start lg:gap-8">
        <PipelineRail />
        <div className="space-y-4">{children}</div>
      </div>
    </PipelineCtx.Provider>
  );
}

function StepDot({ status, number, small }: { status: StepStatus; number: number; small?: boolean }) {
  const size = small ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm";
  if (status === "done") {
    return (
      <span className={`flex ${size} flex-none items-center justify-center rounded-full bg-neutral-800 text-white`}>
        <Check className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </span>
    );
  }
  if (status === "attention") {
    return (
      <span className={`flex ${size} flex-none items-center justify-center rounded-full bg-rose-600 text-white`}>
        <AlertCircle className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span
        className={`flex ${size} flex-none items-center justify-center rounded-full bg-rose-600 font-semibold text-white`}
      >
        {number}
      </span>
    );
  }
  // available / locked
  return (
    <span
      className={`flex ${size} flex-none items-center justify-center rounded-full border font-semibold ${
        status === "locked" ? "border-neutral-200 text-neutral-300" : "border-neutral-300 text-neutral-500"
      }`}
    >
      {number}
    </span>
  );
}

function PipelineRail() {
  const { steps, openIds, openAndScroll } = usePipeline();
  return (
    <nav aria-label="Voortgang" className="hidden lg:block lg:sticky lg:top-8">
      <ol>
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              onClick={() => openAndScroll(s.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-neutral-50"
            >
              <StepDot status={s.status} number={i + 1} small />
              <span
                className={`text-sm ${
                  openIds.includes(s.id) || s.status === "active" || s.status === "attention"
                    ? "font-medium text-neutral-900"
                    : s.status === "locked"
                      ? "text-neutral-400"
                      : "text-neutral-600"
                }`}
              >
                {s.title}
              </span>
            </button>
            {i < steps.length - 1 && <div className="ml-[1.55rem] h-3 w-px bg-neutral-200" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function MobileStepIndicator() {
  const { steps } = usePipeline();
  const attention = steps.find((s) => s.status === "attention");
  const active = steps.find((s) => s.status === "active");
  const highlight = attention ?? active;
  if (!highlight) return null;
  const idx = steps.findIndex((s) => s.id === highlight.id);
  return (
    <p className={`mb-4 text-sm lg:hidden ${attention ? "font-medium text-rose-700" : "text-neutral-500"}`}>
      Stap {idx + 1} van {steps.length} · {highlight.title}
      {attention ? " — aandacht nodig" : ""}
    </p>
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
  const { steps, openIds, toggle } = usePipeline();
  const meta = steps.find((s) => s.id === id);
  if (!meta) throw new Error(`Unknown pipeline step id: ${id}`);
  const open = openIds.includes(id);

  return (
    <section id={`step-${id}`} className="scroll-mt-8">
      <div
        className={`rounded-xl border bg-white ${
          meta.status === "attention" ? "border-rose-200" : "border-neutral-200"
        }`}
      >
        <button
          onClick={() => toggle(id)}
          className="flex w-full items-center gap-3 px-5 py-4 text-left"
          aria-expanded={open}
        >
          <StepDot status={meta.status} number={number} />
          <div className="min-w-0 flex-1">
            <h2
              className={`text-sm font-semibold ${
                meta.status === "attention" ? "text-rose-700" : "text-neutral-900"
              }`}
            >
              {meta.title}
            </h2>
            {!open && meta.summary && <p className="mt-0.5 truncate text-xs text-neutral-500">{meta.summary}</p>}
          </div>
          <ChevronDown
            className={`h-4 w-4 flex-none text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {/* Rendered (not unmounted) while collapsed, so drafts inside (e.g. a typed
            config, an edited role table) survive a collapse/expand toggle. */}
        <div className={open ? "px-5 pb-5" : "hidden"}>{children}</div>
      </div>
    </section>
  );
}
