"use client";

import { useState } from "react";
import { IconClose, IconMinus, IconPlus } from "@/components/icons";
import {
  aantalAanpassingen,
  groepeerHerkenning,
  herkenningSleutel,
  leesCorrectie,
  regelNaKlik,
  rijStand,
  schrijfCorrectie,
  telVerantwoording,
  type BronBlok,
  type GroepBlok,
} from "@/lib/marketingAnalyse/dataverantwoording";
import { datumKort, formatWaarde, looptijdLabel } from "@/lib/marketingAnalyse/rekenen";
import type { Herkenning, MaCampagne, MaOverzichtRegel, MaResultaat } from "@/lib/marketingAnalyse/types";

/** Eén vaste regel zetten of weghalen; de server voegt hem in de Data correctie zoals die nu is. */
async function zetCorrectieRegel(campagneId: string, sleutel: string, regel: string | null): Promise<MaCampagne> {
  const res = await fetch(`/api/marketing-analyse?id=${encodeURIComponent(campagneId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correctieRegel: { sleutel, regel } }),
  });
  const data = (await res.json().catch(() => ({}))) as { campagne?: MaCampagne; fout?: string };
  if (!res.ok || !data.campagne) throw new Error(data.fout ?? "Kon de Data correctie niet bijwerken.");
  return data.campagne;
}

/**
 * Het veld Data correctie: altijd de huidige tekst van de campagne, voor de volgende analyse. De
 * vaste regels die − en + in de Dataverantwoording zetten staan als lijst boven het tekstveld; in
 * het tekstveld zelf alleen de vrije tekst.
 */
export function DataCorrectie({
  campagne,
  bijVersie,
  onOpgeslagen,
}: {
  campagne: MaOverzichtRegel;
  bijVersie: string | null | undefined;
  onOpgeslagen: (c: MaCampagne) => void;
}) {
  const huidig = leesCorrectie(campagne.dataCorrectie);
  const [tekst, setTekst] = useState(huidig.vrij);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const gewijzigd = tekst.trim() !== huidig.vrij.trim();

  async function opslaan() {
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      const res = await fetch(`/api/marketing-analyse?id=${encodeURIComponent(campagne.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataCorrectie: schrijfCorrectie(huidig.regels, tekst) }),
      });
      const data = (await res.json().catch(() => ({}))) as { campagne?: MaCampagne; fout?: string };
      if (!res.ok || !data.campagne) throw new Error(data.fout ?? "Kon de Data correctie niet opslaan.");
      onOpgeslagen(data.campagne);
      setMelding("Opgeslagen. De volgende analyse neemt dit mee.");
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(false);
    }
  }

  async function haalRegelWeg(sleutel: string) {
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      onOpgeslagen(await zetCorrectieRegel(campagne.id, sleutel, null));
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
      <h2 className="label-theme text-label text-ink-muted">Data correctie</h2>
      <p className="mt-1 max-w-[90ch] text-meta text-ink-faint">
        Wat de volgende analyse anders moet doen. De − en + in de Dataverantwoording komen hier vanzelf te staan; daaronder kun je zelf
        opschrijven wat er mist of te veel is meegenomen. De volgende analyse past het toe en meldt wat hij ermee deed.
      </p>
      {huidig.regels.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-line-soft rounded-card border border-line-soft">
          {huidig.regels.map((r) => (
            <li key={r.sleutel} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-control border border-line text-ink-muted"
              >
                {r.actie === "weglaten" ? <IconMinus className="h-3 w-3" /> : <IconPlus className="h-3 w-3" />}
              </span>
              <span className="w-20 shrink-0 text-meta text-ink-muted">{r.actie === "weglaten" ? "Weglaten" : "Meenemen"}</span>
              <span className="min-w-0 flex-1 truncate text-ink" title={r.omschrijving}>
                {r.omschrijving}
              </span>
              <button
                type="button"
                onClick={() => haalRegelWeg(r.sleutel)}
                disabled={bezig}
                aria-label={`Regel weghalen: ${r.omschrijving}`}
                title="Regel weghalen"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-ink-faint transition-colors duration-[var(--duur-snel)] ease-merk hover:text-ink disabled:opacity-50"
              >
                <IconClose className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <textarea
        value={tekst}
        onChange={(e) => {
          setTekst(e.target.value);
          setMelding(null);
        }}
        aria-label="Data correctie"
        placeholder="Bijvoorbeeld: pagina /acties/a2-roadshow hoort er ook bij."
        rows={4}
        className="mt-3 w-full resize-y rounded-card border border-line bg-surface-tint px-4 py-3 text-sm text-ink outline-none focus:border-primary"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-meta text-ink-faint">
          {(bijVersie ?? "") !== (campagne.dataCorrectie ?? "")
            ? bijVersie
              ? "Deze versie is gemaakt met een eerdere tekst."
              : "Deze versie is gemaakt zonder Data correctie."
            : campagne.dataCorrectieBijgewerktOp
              ? `Laatst aangepast ${datumKort(campagne.dataCorrectieBijgewerktOp)}.`
              : ""}
        </p>
        <div className="flex items-center gap-3">
          {fout && <span className="text-sm text-negative">{fout}</span>}
          {melding && <span className="text-sm text-positive">{melding}</span>}
          <button
            type="button"
            onClick={opslaan}
            disabled={bezig || !gewijzigd}
            className="rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {bezig ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Dataverantwoording
// ---------------------------------------------------------------------------

const MEERVOUD: Record<string, string> = {
  campagne: "campagnes",
  advertentie: "advertenties",
  advertentieset: "advertentiesets",
  post: "posts",
  pagina: "pagina's",
  event: "events",
  mailing: "mailings",
  filter: "filters",
};

/** "4 campagnes", "3 posts", of "5 onderdelen" als de soorten door elkaar lopen. */
function aantalLabel(rijen: Herkenning[]): string {
  const soorten = new Set(rijen.map((r) => r.soort.toLowerCase().trim()));
  const n = rijen.length;
  if (soorten.size === 1) {
    const soort = [...soorten][0];
    if (n === 1) return `1 ${soort}`;
    return `${n} ${MEERVOUD[soort] ?? soort}`;
  }
  return `${n} ${n === 1 ? "onderdeel" : "onderdelen"}`;
}

function wanneer(h: Herkenning): string | null {
  if (h.datum && h.tot) return looptijdLabel(h.datum, h.tot);
  if (h.datum) return /^\d{4}-\d{2}-\d{2}$/.test(h.datum) ? datumKort(`${h.datum}T12:00:00Z`) : h.datum;
  if (h.tot) return looptijdLabel(null, h.tot);
  return null;
}

/** − en + zetten een regel, ongedaan maken zet de stand van deze versie terug, wis haalt de regel weg. */
type Klik = "min" | "plus" | "ongedaan" | "wis";

function Rij({
  h,
  opgenomen,
  tekstNu,
  tekstBijVersie,
  bezig,
  onKlik,
}: {
  h: Herkenning;
  opgenomen: boolean;
  tekstNu: string | null;
  tekstBijVersie: string | null | undefined;
  bezig: boolean;
  onKlik: (h: Herkenning, klik: Klik) => void;
}) {
  const stand = rijStand(h, tekstNu, tekstBijVersie);
  const eraf = opgenomen && stand.wens === "weglaten";
  const erbij = !opgenomen && stand.wens === "meenemen";
  const wacht = eraf || erbij;
  const [hoofd, ...rest] = h.cijfers ?? [];
  const tijd = wanneer(h);
  const viaCorrectie =
    h.viaCorrectie === "meenemen" && opgenomen
      ? "Meegenomen via de Data correctie"
      : (h.viaCorrectie === "weglaten" || stand.wens === "weglaten") && !opgenomen
        ? "Weggelaten via de Data correctie"
        : null;

  return (
    <li className="group grid grid-cols-[6.5rem_minmax(0,1fr)_7.5rem_9rem_2rem] items-start gap-x-4 px-6 py-2.5">
      <span className="pt-px text-meta text-ink-muted first-letter:uppercase">{h.soort}</span>
      <div className="min-w-0">
        <p className={`flex flex-wrap items-baseline gap-x-2 text-sm ${eraf ? "text-ink-faint line-through" : "font-medium text-ink"}`}>
          {h.url ? (
            <a href={h.url} target="_blank" rel="noopener noreferrer" className="break-words underline-offset-2 hover:underline">
              {h.naam}
              <span aria-hidden="true" className="ml-1 text-ink-faint">
                ↗
              </span>
            </a>
          ) : (
            <span className="break-words">{h.naam}</span>
          )}
          {h.zekerheid && h.zekerheid !== "zeker" && (
            <span className="rounded-control border border-line-soft px-1.5 text-meta font-normal text-ink-muted no-underline">{h.zekerheid}</span>
          )}
        </p>
        <p className="mt-0.5 text-meta text-ink-faint">
          {[h.account, h.reden, viaCorrectie && !/data correctie/i.test(h.reden ?? "") ? viaCorrectie : null].filter(Boolean).join(" · ")}
        </p>
        {wacht && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-meta">
            <span className="text-ink">
              {stand.klaar
                ? eraf
                  ? "Gaat eraf bij de volgende analyse"
                  : "Komt erbij bij de volgende analyse"
                : eraf
                  ? "Staat in de Data correctie als weglaten"
                  : "Staat in de Data correctie als meenemen"}
            </span>
            <span aria-hidden="true" className="text-ink-faint">
              ·
            </span>
            <button
              type="button"
              onClick={() => onKlik(h, stand.klaar ? "ongedaan" : "wis")}
              disabled={bezig}
              className="text-ink-muted underline underline-offset-2 hover:text-ink disabled:opacity-50"
            >
              {stand.klaar ? "Ongedaan maken" : "Uit de Data correctie halen"}
            </button>
          </p>
        )}
      </div>
      <span className={`whitespace-nowrap pt-px text-meta ${eraf ? "text-ink-faint" : "text-ink-muted"}`}>{tijd ?? ""}</span>
      <div className={`text-right ${eraf ? "opacity-60" : ""}`}>
        {hoofd && (
          <p className="whitespace-nowrap text-sm tabular-nums text-ink vdu:font-semibold">
            {formatWaarde(hoofd.waarde, hoofd.eenheid)} <span className="text-meta font-normal text-ink-muted">{hoofd.label}</span>
          </p>
        )}
        {rest.length > 0 && (
          <p className="mt-0.5 text-meta tabular-nums text-ink-muted">
            {rest.map((c) => `${formatWaarde(c.waarde, c.eenheid)} ${c.label}`).join(" · ")}
          </p>
        )}
      </div>
      <div className="flex justify-end">
        {!wacht && (
          <button
            type="button"
            onClick={() => onKlik(h, opgenomen ? "min" : "plus")}
            disabled={bezig}
            aria-label={opgenomen ? `Weglaten bij de volgende analyse: ${h.naam}` : `Meenemen bij de volgende analyse: ${h.naam}`}
            title={opgenomen ? "Weglaten bij de volgende analyse" : "Meenemen bij de volgende analyse"}
            className={`flex h-7 w-7 items-center justify-center rounded-control border border-line text-ink-muted transition-[color,border-color,opacity] duration-[var(--duur-snel)] ease-merk hover:border-ink-muted hover:text-ink disabled:opacity-50 ${
              opgenomen ? "opacity-0 focus-visible:opacity-100 group-hover:opacity-100" : ""
            }`}
          >
            {opgenomen ? <IconMinus className="h-3.5 w-3.5" /> : <IconPlus className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </li>
  );
}

const ZICHTBAAR = 8;

function BronLijst({
  blok,
  opgenomen,
  ...rij
}: {
  blok: BronBlok;
  opgenomen: boolean;
  tekstNu: string | null;
  tekstBijVersie: string | null | undefined;
  bezigSleutel: string | null;
  onKlik: (h: Herkenning, klik: Klik) => void;
}) {
  const [alles, setAlles] = useState(false);
  const f = blok.filter;
  const kop = [f?.accounts?.join(", "), f?.filter, f?.periode].filter(Boolean).join(" · ");
  const rijen = alles ? blok.rijen : blok.rijen.slice(0, ZICHTBAAR);
  return (
    <div className="border-t border-line-soft first:border-t-0">
      <div className="flex items-baseline justify-between gap-4 px-6 pb-1 pt-3">
        <p className="min-w-0 text-sm">
          <span className="font-semibold text-ink">{blok.bron}</span>
          {kop && <span className="text-meta text-ink-muted"> · {kop}</span>}
        </p>
        <span className="shrink-0 text-meta text-ink-faint">{blok.rijen.length > 0 ? aantalLabel(blok.rijen) : "niets gevonden"}</span>
      </div>
      {rijen.length > 0 && (
        <ul className="pb-1">
          {rijen.map((h, i) => (
            <Rij
              key={`${herkenningSleutel(h)}-${i}`}
              h={h}
              opgenomen={opgenomen}
              tekstNu={rij.tekstNu}
              tekstBijVersie={rij.tekstBijVersie}
              bezig={rij.bezigSleutel === herkenningSleutel(h)}
              onKlik={rij.onKlik}
            />
          ))}
        </ul>
      )}
      {blok.rijen.length > ZICHTBAAR && (
        <button
          type="button"
          onClick={() => setAlles((x) => !x)}
          className="mb-2 ml-6 text-meta text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          {alles ? "Minder tonen" : `Nog ${blok.rijen.length - ZICHTBAAR} tonen`}
        </button>
      )}
    </div>
  );
}

function Groepen({ groepen, opgenomen, ...rij }: { groepen: GroepBlok[]; opgenomen: boolean } & Omit<Parameters<typeof BronLijst>[0], "blok" | "opgenomen">) {
  return (
    <>
      {groepen.map((g) => (
        <div key={g.groep} className="pb-2">
          <p className="label-theme px-6 pb-0.5 pt-4 text-label text-ink-faint">{g.groep}</p>
          {g.bronnen.map((b) => (
            <BronLijst key={b.bron} blok={b} opgenomen={opgenomen} {...rij} />
          ))}
        </div>
      ))}
    </>
  );
}

/**
 * Het onderdeel Dataverantwoording (plan §25): per databron welke datapunten de analyse heeft
 * meegenomen en hoe er gefilterd is, met op hover een − om iets weg te laten; onder een streep de
 * mogelijke touchpoints die hij niet meenam, met een + om ze mee te nemen. Elke klik zet een vaste
 * regel in de Data correctie, die de volgende analyse toepast. Daaronder wat er met de vorige Data
 * correctie is gedaan, de kanttekeningen, het veld Data correctie en de voorstellen voor de
 * semantic layer.
 */
export default function Verantwoording({
  resultaat: r,
  campagne,
  dataCorrectieBijVersie,
  isEigenaar,
  onCampagneBijgewerkt,
  versieId,
  volgendeAnalyse,
}: {
  resultaat: MaResultaat;
  campagne: MaOverzichtRegel;
  dataCorrectieBijVersie: string | null | undefined;
  isEigenaar: boolean;
  onCampagneBijgewerkt: (c: MaCampagne) => void;
  versieId: string;
  /** "vr 4 dec"; null als de planning uit staat. */
  volgendeAnalyse: string | null;
}) {
  const [bezigSleutel, setBezigSleutel] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const bronFilters = r.bronFilters ?? [];
  const meegenomen = groepeerHerkenning(r.herkenning, bronFilters, true);
  const nietMeegenomen = groepeerHerkenning(r.herkenning, bronFilters, false);
  const telling = telVerantwoording(r.herkenning);
  const tekstNu = campagne.dataCorrectie;
  const aanpassingen = aantalAanpassingen(tekstNu, dataCorrectieBijVersie);

  async function klik(h: Herkenning, soort: Klik) {
    const sleutel = herkenningSleutel(h);
    setBezigSleutel(sleutel);
    setFout(null);
    try {
      onCampagneBijgewerkt(await zetCorrectieRegel(campagne.id, sleutel, soort === "wis" ? null : regelNaKlik(h, soort, dataCorrectieBijVersie)));
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezigSleutel(null);
    }
  }

  const rij = { tekstNu, tekstBijVersie: dataCorrectieBijVersie, bezigSleutel, onKlik: klik };

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-panel border border-line bg-card shadow-subtle">
        <header className="border-b border-line-soft px-6 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="label-theme text-label text-ink-muted">Dataverantwoording</h2>
            <p className="text-meta text-ink-faint">
              {volgendeAnalyse
                ? `Aanpassingen gelden vanaf de volgende analyse (${volgendeAnalyse})`
                : "De planning staat uit: aanpassingen gelden vanaf de volgende analyse die je start"}
            </p>
          </div>
          <p className="mt-1 text-sm text-ink">
            {telling.meegenomen} {telling.meegenomen === 1 ? "onderdeel" : "onderdelen"} meegenomen uit {telling.bronnen}{" "}
            {telling.bronnen === 1 ? "bron" : "bronnen"}
            <span className="text-ink-muted">
              {" · "}
              {telling.nietMeegenomen} {telling.nietMeegenomen === 1 ? "mogelijk touchpoint" : "mogelijke touchpoints"} niet meegenomen
              {aanpassingen > 0 && ` · ${aanpassingen} ${aanpassingen === 1 ? "aanpassing" : "aanpassingen"} klaar`}
            </span>
          </p>
          <p className="mt-1 max-w-[100ch] text-meta text-ink-faint">
            Per bron wat de analyse aan deze campagne heeft toegerekend en hoe er gefilterd is. Hoort iets er niet bij? Ga er met de muis
            overheen en klik op −. Het komt vanzelf in de Data correctie te staan.
          </p>
          {bronFilters.length === 0 && r.bronnen && r.bronnen.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.bronnen.map((b) => (
                <span key={b} className="rounded-control border border-line-soft bg-surface-tint px-2 py-0.5 text-meta text-ink-muted">
                  {b}
                </span>
              ))}
            </div>
          )}
          {fout && <p className="mt-2 text-sm text-negative">{fout}</p>}
        </header>

        {meegenomen.length === 0 ? (
          <p className="px-6 py-4 text-sm text-ink-muted">Geen toewijzingen vastgelegd.</p>
        ) : (
          <Groepen groepen={meegenomen} opgenomen {...rij} />
        )}

        <div className="border-t-2 border-line">
          <div className="px-6 pb-1 pt-4">
            <h3 className="label-theme text-label text-ink-muted">Mogelijke touchpoints, niet meegenomen</h3>
            <p className="mt-1 text-meta text-ink-faint">
              Wat de analyse bekeek maar bewust niet meenam, met de reden. Hoort het er wel bij? Klik op +.
            </p>
          </div>
          {nietMeegenomen.length === 0 ? (
            <p className="px-6 pb-4 pt-2 text-sm text-ink-muted">
              Deze versie heeft geen twijfelgevallen vastgelegd. Analyses vanaf 28 november 2026 doen dat wel.
            </p>
          ) : (
            <Groepen groepen={nietMeegenomen} opgenomen={false} {...rij} />
          )}
        </div>

        {r.correcties && r.correcties.length > 0 && (
          <div className="border-t border-line-soft px-6 py-4">
            <p className="mb-2 text-sm font-semibold text-ink">Wat er met de Data correctie is gedaan</p>
            <ul className="flex flex-col gap-2 text-sm">
              {r.correcties.map((c, i) => (
                <li key={i}>
                  <span className="text-ink">{c.correctie}</span>
                  <span className="text-ink-muted"> → {c.verwerking}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {r.datakwaliteit && r.datakwaliteit.length > 0 && (
          <div className="border-t border-line-soft px-6 py-4">
            <p className="mb-2 text-sm font-semibold text-ink">Kanttekeningen bij de data</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-muted">
              {r.datakwaliteit.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <DataCorrectie key={versieId} campagne={campagne} bijVersie={dataCorrectieBijVersie} onOpgeslagen={onCampagneBijgewerkt} />

      {r.semantiekVoorstellen && r.semantiekVoorstellen.length > 0 && (
        <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
          <h2 className="label-theme text-label text-ink-muted">Voorstellen voor de semantic layer</h2>
          <p className="mt-1 text-meta text-ink-faint">
            Bevindingen die voor alle campagnes lijken te gelden. De analyse past de semantic layer nooit zelf aan
            {isEigenaar ? "; neem over wat klopt via de knop Semantic layer." : "; de eigenaar beslist."}
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {r.semantiekVoorstellen.map((v, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 rounded-control border border-line px-1.5 py-0.5 text-meta text-ink-muted">{v.blok}</span>
                <div className="min-w-0">
                  <p className="text-sm text-ink">{v.voorstel}</p>
                  <p className="mt-0.5 text-meta text-ink-muted">{v.reden}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
