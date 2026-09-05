"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Opmaak in de antwoorden. Het model schrijft koppen, opsommingen en vetgedrukte
 * getallen; zonder deze laag verschijnen de sterretjes en streepjes letterlijk in beeld.
 *
 * Bewust compact gehouden: dit staat in een chatbubbel, niet op een artikelpagina.
 */
const ONDERDELEN = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-sans-w7 font-semibold text-ink">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em>{children}</em>,
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-4 mb-2 font-sans-w7 text-base font-bold text-ink first:mt-0">{children}</h3>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-4 mb-2 font-sans-w7 text-base font-bold text-ink first:mt-0">{children}</h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mt-3 mb-1.5 font-sans-w7 text-sm font-bold text-ink first:mt-0">{children}</h4>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 flex list-disc flex-col gap-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 flex list-decimal flex-col gap-1 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed marker:text-orange">{children}</li>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
      {children}
    </code>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
      {children}
    </a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-3 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-b border-line bg-accent px-3 py-2 text-left font-sans-w7 text-xs font-semibold tracking-wide text-ink uppercase">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-b border-line px-3 py-2 text-ink tabular-nums">{children}</td>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-3 border-l-2 border-accent-dark pl-3 text-ink-muted last:mb-0">
      {children}
    </blockquote>
  ),
};

export default function Markdown({ tekst }: { tekst: string }) {
  return (
    // Begrensde regellengte: bij ~100 tekens per regel raakt het oog de volgende regel
    // kwijt. Alleen de lopende tekst wordt begrensd — grafieken en tabellen krijgen
    // hun volle breedte, want daar helpt ruimte juist.
    <div className="max-w-[68ch] text-ink">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={ONDERDELEN}>
        {tekst}
      </ReactMarkdown>
    </div>
  );
}
