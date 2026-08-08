type Props = {
  pros: string[];
  cons: string[];
  /** Op productkaarten tonen we alleen de sterkste punten; op de detailpagina alles. */
  limit?: number;
};

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 fill-good" aria-hidden="true">
      <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.9 5.6l-4.5 5.2a.8.8 0 01-1.2 0L4.1 8.7l1.2-1 1.5 1.7 3.9-4.5 1.2 .7z" />
    </svg>
  );
}

function Cross() {
  return (
    <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 fill-bad" aria-hidden="true">
      <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3 10L10 11 8 9l-2 2-1-1 2-2-2-2 1-1 2 2 2-2 1 1-2 2 2 2z" />
    </svg>
  );
}

export default function ProsCons({ pros, cons, limit }: Props) {
  const shownPros = limit ? pros.slice(0, limit) : pros;
  const shownCons = limit ? cons.slice(0, limit) : cons;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-bold text-ink">Pluspunten</h3>
        <ul className="space-y-1.5">
          {shownPros.map((pro) => (
            <li key={pro} className="flex gap-2 text-sm text-ink-muted">
              <Check />
              <span>{pro}</span>
            </li>
          ))}
        </ul>
      </div>

      {shownCons.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-ink">Minpunten</h3>
          <ul className="space-y-1.5">
            {shownCons.map((con) => (
              <li key={con} className="flex gap-2 text-sm text-ink-muted">
                <Cross />
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
