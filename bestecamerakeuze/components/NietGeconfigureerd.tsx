/**
 * Wat het chattabblad toont zolang de omgeving nog niet compleet is.
 *
 * Bewust een duidelijke, feitelijke lijst in plaats van een foutmelding: dit is de
 * normale toestand tot de sheets, de database en de API-sleutel zijn aangesloten, en
 * het campagne-tabblad ernaast werkt gewoon door.
 */
export default function NietGeconfigureerd({ ontbreekt }: { ontbreekt: string[] }) {
  return (
    <div className="rounded-panel border border-line bg-surface p-8">
      <p className="font-sans-w7 text-lg font-bold text-ink">
        Het dataloket staat klaar, maar is nog niet aangesloten
      </p>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        De chat, de guardrails en het datawoordenboek zijn gebouwd. Er ontbreken nog
        omgevingsvariabelen voordat er echt gevraagd kan worden:
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {ontbreekt.map((item) => (
          <li key={item} className="flex gap-3 text-sm text-ink">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 max-w-2xl text-sm text-ink-muted">
        Zie <code className="rounded bg-card px-1.5 py-0.5 text-xs">bestecamerakeuze/README-dataloket.md</code>{" "}
        voor de stappen: migratie draaien, read-only rol aanmaken en de variabelen in
        Vercel zetten.
      </p>
    </div>
  );
}
