import type { FaqItem } from "@/lib/vlog";

/**
 * Accordeon op <details>/<summary>: opent en sluit zonder JavaScript, is met het
 * toetsenbord te bedienen en wordt door schermlezers als uitklapbaar aangekondigd —
 * allemaal zonder dat wij daar een eigen implementatie voor onderhouden.
 */
export default function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-card">
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-ink transition-colors hover:bg-page sm:px-6">
            {item.question}
            <span
              aria-hidden="true"
              className="shrink-0 text-xl leading-none text-brand transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="px-5 pb-5 leading-relaxed text-ink-muted sm:px-6">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
