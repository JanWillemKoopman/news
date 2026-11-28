/**
 * Laadskelet (G4): grijze balkjes in de vorm van wat er komt, in plaats van het woord
 * "Laden…". Zo springt de pagina niet als de data binnen is, en voelt wachten korter.
 * De kleur en het ademen staan in `.skelet` (globals.css), dus het klopt in elk theme.
 */

type Props = { className?: string };

/** Eén balkje. Geef breedte en hoogte mee via className. */
export function SkeletBalk({ className = "" }: Props) {
  return <span aria-hidden="true" className={`skelet block rounded-control ${className}`} />;
}

/** Een paar tekstregels, de laatste korter — voor een zijbalk of een lijstje. */
export function SkeletRegels({ aantal = 3, className = "" }: { aantal?: number; className?: string }) {
  const breedtes = ["w-full", "w-11/12", "w-4/5", "w-2/3", "w-3/4"];
  return (
    <div role="status" aria-label="Bezig met laden" className={`flex flex-col gap-2.5 ${className}`}>
      {Array.from({ length: aantal }, (_, i) => (
        <SkeletBalk key={i} className={`h-3.5 ${i === aantal - 1 ? "w-1/2" : breedtes[i % breedtes.length]}`} />
      ))}
    </div>
  );
}

/** Tabelrijen: per rij een naam met subregel en een paar kolommen getallen. */
export function SkeletTabel({ rijen = 4, kolommen = 5, className = "" }: { rijen?: number; kolommen?: number; className?: string }) {
  return (
    <div role="status" aria-label="Bezig met laden" className={`divide-y divide-line-soft ${className}`}>
      {Array.from({ length: rijen }, (_, r) => (
        <div key={r} className="flex items-start gap-8 px-6 py-5">
          <div className="flex w-64 shrink-0 flex-col gap-2">
            <SkeletBalk className="h-4 w-3/4" />
            <SkeletBalk className="h-3 w-1/2" />
          </div>
          {Array.from({ length: kolommen }, (_, k) => (
            <div key={k} className="flex flex-1 flex-col gap-2">
              <SkeletBalk className="h-4 w-16" />
              <SkeletBalk className="h-3 w-24" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Een blok met kaarten naast elkaar (Campagne analyse: kerncijfers + kolommen). */
export function SkeletKaarten({ aantal = 4, className = "" }: { aantal?: number; className?: string }) {
  return (
    <div role="status" aria-label="Bezig met laden" className={`flex flex-col gap-5 ${className}`}>
      <div className="grid grid-cols-4 gap-5">
        {Array.from({ length: aantal }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-panel border border-line bg-card p-5">
            <SkeletBalk className="h-3 w-24" />
            <SkeletBalk className="h-6 w-20" />
            <SkeletBalk className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-panel border border-line bg-card">
        <SkeletTabel rijen={4} kolommen={4} />
      </div>
    </div>
  );
}
