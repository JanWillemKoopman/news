"use client";

import { getBrandLogo } from "@/components/brandLogos";
import { LEEG_OPTIE, type Filter, type Veld } from "@/lib/selligent/stand";
import { toonWaarde } from "@/lib/selligent/weergave";

/**
 * De merkbalk: alle merken naast elkaar, standaard allemaal aan, los uit te zetten.
 *
 * ## Waarom merk niet in het raster staat
 *
 * Omdat het het filter is dat het vaakst wordt aangeraakt, en omdat het er een is waarvan
 * je de stand wil zíen. In een uitklapmenu achter een dichtgeklapte balk staat er "3
 * geselecteerd" en moet je hem openklappen om te weten welke drie. Hier staan ze er
 * allemaal, en zie je in één oogopslag wat er meedoet.
 *
 * ## Alles aan is hetzelfde als geen filter
 *
 * Er is geen aparte "alles"-stand die ergens apart bijgehouden wordt. Staan alle merken
 * aan, dan staat er geen filter op de kolom; zet je er een uit, dan wordt het filter de
 * merken die overblijven. Daardoor kan de balk nooit uit de pas lopen met de chips boven
 * de filterbalk of met wat de server telt — het is dezelfde ene filterwaarde, alleen
 * anders getekend.
 *
 * ## "Geen merk" is een merk
 *
 * 58.235 van de 169.290 rijen hebben geen merkwaarde: dat zijn contacten zonder voertuig.
 * Die zitten als eigen knop in de balk (`LEEG_OPTIE`) en staan net als de rest aan. Zonder
 * die knop zou het uitzetten van één merk stilzwijgend ook alle contacten zonder auto
 * wegfilteren, en dan verdwijnt een derde van het bestand zonder dat iemand daarom vroeg.
 *
 * ## De logo's komen uit de bestaande set
 *
 * `getBrandLogo` kent de merken van het concern; wat hij niet kent (`BWG`, `AM_PKW`, en de
 * codes die in deze export tussen de merken staan) blijft gewoon tekst. Er wordt niets
 * vertaald of opgeschoond: de knop draagt de waarde zoals hij in het bestand staat, het
 * logo is er alleen bij.
 */

export default function SelligentMerkBalk({
  veld,
  filter,
  onFilter,
  bezig,
}: {
  veld: Veld;
  filter: Filter | undefined;
  onFilter: (filter: Filter | null) => void;
  bezig: boolean;
}) {
  const merken = veld.opties ?? [];
  if (merken.length === 0) return null;

  // Geen filter betekent: alles doet mee. Dat is ook de stand waarin de balk opent.
  const aan = filter?.waarden?.length ? filter.waarden : merken;
  const allesAan = aan.length === merken.length;

  function wissel(merk: string) {
    const volgende = aan.includes(merk) ? aan.filter((m) => m !== merk) : [...aan, merk];
    // Alles weer aan = geen filter, zodat de chip erboven ook verdwijnt. En alles uit
    // laten we niet gebeuren: dat levert een leeg scherm op zonder dat je ziet waarom.
    // Het laatste merk uitzetten draait de selectie dus om naar "alleen dit merk niet".
    if (volgende.length === merken.length || volgende.length === 0) {
      onFilter(volgende.length === 0 ? { kolom: veld.naam, waarden: [merk] } : null);
      return;
    }
    onFilter({ kolom: veld.naam, waarden: volgende });
  }

  return (
    <section
      className={`rounded-panel border border-line bg-card px-5 py-3 shadow-subtle transition-opacity ${
        bezig ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="label-theme text-label text-ink-faint" title={veld.naam}>
          Merk
        </span>

        <ul className="flex flex-1 flex-wrap items-center gap-1.5">
          {merken.map((merk) => (
            <MerkKnop
              key={merk}
              merk={merk}
              aan={aan.includes(merk)}
              onWissel={() => wissel(merk)}
            />
          ))}
        </ul>

        {!allesAan && (
          <button
            type="button"
            onClick={() => onFilter(null)}
            className="shrink-0 rounded-control px-2 py-1 text-sm font-medium text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink"
          >
            Alle merken
          </button>
        )}
      </div>
    </section>
  );
}

function MerkKnop({
  merk,
  aan,
  onWissel,
}: {
  merk: string;
  aan: boolean;
  onWissel: () => void;
}) {
  const Logo = merk === LEEG_OPTIE ? null : getBrandLogo(merk);
  const label = merk === LEEG_OPTIE ? "Geen merk" : toonWaarde(merk);

  return (
    <li>
      <button
        type="button"
        onClick={onWissel}
        aria-pressed={aan}
        title={aan ? `${label} uitzetten` : `${label} aanzetten`}
        className={`flex items-center gap-1.5 rounded-button border px-2.5 py-1 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
          aan
            ? "border-ink bg-ink font-medium text-card"
            : "border-line text-ink-faint hover:bg-surface hover:text-ink-muted"
        }`}
      >
        {Logo && <Logo className="h-3.5 w-auto" />}
        {label}
      </button>
    </li>
  );
}
