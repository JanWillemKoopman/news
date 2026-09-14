"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconCheck, IconInfo, IconSearch } from "@/components/icons";

/**
 * Wat betekent elke conversie-actie: een lead, een conversie, allebei of geen van beide?
 *
 * **Waarom dit hier staat en niet bij Instellingen.** Het is dezelfde soort keuze als de
 * koppeltabel erboven: iets wat de platforms niet leveren en het team zelf vastlegt over
 * zijn eigen data. Wie de campagnemanagers invult, is ook degene die weet dat
 * "generate_lead_offerte" een lead is en "page_view_contact" niet.
 *
 * **Twee vinkjes, twee gaten in de data.** Google Ads kent geen leadveld; Meta kent geen
 * conversieveld. Beide kolommen waren daardoor onbruikbaar — Google's leads stonden op
 * nul, en Meta's conversies waren de som van álle acties, inclusief acties die elkaar
 * overlappen. Hier vult het team die twee gaten zelf.
 *
 * **Waarom "telt als conversie" alleen voor Meta kan.** Google en LinkedIn leveren wél
 * een eigen conversietotaal, en bij Google zitten deze acties daar al in. Een Google-actie
 * erbij optellen zou hem dubbel tellen, dus dat vinkje staat daar uit — en `bron.ts`
 * filtert er bij het optellen nog een keer op, zodat een vinkje dat er toch staat geen
 * verkeerd cijfer kan opleveren.
 */

export interface ConversieActie {
  veld: string;
  label: string;
  bron: string;
  account: string | null;
  aantal: number;
  laatstGezien: string | null;
  teltAlsLead: boolean;
  teltAlsConversie: boolean;
  /** Is het label met de hand bijgesteld? Dan laat de sync het staan. */
  gewijzigd: boolean;
}

const BRON_LABEL: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  linkedin: "LinkedIn",
};

export default function ConversiePaneel() {
  const [acties, setActies] = useState<ConversieActie[]>([]);
  const [bezig, setBezig] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [zoek, setZoek] = useState("");
  const [bewaard, setBewaard] = useState<string | null>(null);

  const haal = useCallback(() => {
    setBezig(true);
    fetch("/api/kanalen/conversies")
      .then(async (res) => {
        const data = (await res.json()) as { acties?: ConversieActie[]; fout?: string };
        if (!res.ok) {
          setFout(data.fout ?? `Ophalen mislukt (${res.status}).`);
          return;
        }
        setActies(data.acties ?? []);
        setFout(null);
      })
      .catch((err: unknown) => setFout(err instanceof Error ? err.message : String(err)))
      .finally(() => setBezig(false));
  }, []);

  useEffect(haal, [haal]);

  const zichtbaar = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    if (!term) return acties;
    return acties.filter(
      (a) =>
        a.label.toLowerCase().includes(term) ||
        a.veld.toLowerCase().includes(term) ||
        (a.account ?? "").toLowerCase().includes(term),
    );
  }, [acties, zoek]);

  const alsLead = acties.filter((a) => a.teltAlsLead);
  const alsConversie = acties.filter((a) => a.teltAlsConversie && a.bron === "meta");

  async function bewaar(actie: ConversieActie, patch: Partial<ConversieActie>) {
    const nieuw = { ...actie, ...patch };
    // Meteen in beeld; de serveraanroep bevestigt alleen. Zou de lijst pas na het antwoord
    // bijwerken, dan springt het vinkje even terug.
    setActies((lijst) => lijst.map((a) => (a.veld === actie.veld ? nieuw : a)));

    try {
      const res = await fetch("/api/kanalen/conversies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          veld: nieuw.veld,
          teltAlsLead: nieuw.teltAlsLead,
          teltAlsConversie: nieuw.teltAlsConversie,
          // Alleen meesturen als het een eigen naam is; anders laat de sync het label
          // weer bijwerken vanuit de veldnaam.
          label: nieuw.gewijzigd ? nieuw.label : null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { fout?: string };
        throw new Error(data.fout ?? `Opslaan mislukt (${res.status}).`);
      }
      setBewaard(actie.veld);
      setTimeout(() => setBewaard((v) => (v === actie.veld ? null : v)), 1500);
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
      haal();
    }
  }

  return (
    <section className="kaart-omlijst mt-8 rounded-panel border border-line bg-card shadow-subtle">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">Conversie-acties</h2>
          <p className="mt-0.5 text-meta text-ink-muted">
            {bezig
              ? "Laden…"
              : `${acties.length} acties gezien in de laatste 90 dagen · ${alsLead.length} tellen als lead · ${alsConversie.length} als conversie`}
          </p>
        </div>
        {acties.length > 8 && (
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              id="conversies-zoek"
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              placeholder="Zoek een actie"
              aria-label="Zoeken in de conversie-acties"
              className="w-64 rounded-control border border-line bg-card py-1.5 pl-8 pr-2 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </header>

      <p className="flex items-start gap-2 border-b border-line-soft px-5 py-3 text-meta text-ink-muted">
        <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Google Ads levert geen apart leadveld en Meta geen conversieveld — wat daar een
          lead of een conversie is, staat in de acties die marketing zelf heeft ingesteld.
          Vink hier aan welke dat zijn; de kolommen Leads, Kosten per lead, Conversies en
          Kosten per conversie rekenen er daarna mee. Zolang er niets is aangevinkt, tellen
          de Meta-campagnes voor nul conversies — dat is geen meetfout maar een keuze die
          nog gemaakt moet worden.
          <br />
          <strong className="font-sans-w7 font-semibold">Telt als conversie</strong> kan
          alleen bij Meta: Google en LinkedIn leveren zelf een conversietotaal waar deze
          acties al in zitten, dus daar zou aanvinken dubbel tellen.
        </span>
      </p>

      {fout && <p className="px-5 py-3 text-sm text-negative">{fout}</p>}

      {!bezig && acties.length === 0 && !fout && (
        <p className="px-5 py-8 text-center text-sm text-ink-muted">
          Nog geen conversie-acties in de data. Ze verschijnen hier zodra de sync ze bij een
          platform tegenkomt.
        </p>
      )}

      {zichtbaar.length > 0 && (
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {[
                  "Telt als lead",
                  "Telt als conversie",
                  "Actie",
                  "Kanaal",
                  "Aantal 90 dgn",
                  "Laatst gezien",
                ].map((kop, i) => (
                    <th
                      key={kop}
                      className={`sticky top-0 z-20 whitespace-nowrap border-b border-line bg-surface-tint px-4 py-2.5 ${
                        i === 4 ? "text-right" : "text-left"
                      }`}
                    >
                      <span className="label-theme text-label text-ink-faint">{kop}</span>
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {zichtbaar.map((actie) => (
                <tr key={actie.veld}>
                  <td className="border-b border-line-soft px-4 py-2">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={actie.teltAlsLead}
                        onChange={() => bewaar(actie, { teltAlsLead: !actie.teltAlsLead })}
                        className="h-4 w-4"
                      />
                      {bewaard === actie.veld && (
                        <IconCheck className="h-3.5 w-3.5 text-positive" />
                      )}
                    </label>
                  </td>
                  <td className="border-b border-line-soft px-4 py-2">
                    {actie.bron === "meta" ? (
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={actie.teltAlsConversie}
                          onChange={() =>
                            bewaar(actie, { teltAlsConversie: !actie.teltAlsConversie })
                          }
                          className="h-4 w-4"
                        />
                      </label>
                    ) : (
                      <span
                        className="text-meta text-ink-faint"
                        title="Dit platform levert zelf een conversietotaal waar deze actie al in zit; hem hier aanvinken zou hem dubbel tellen."
                      >
                        —
                      </span>
                    )}
                  </td>
                  <td className="border-b border-line-soft px-2 py-1.5">
                    <LabelVeld
                      waarde={actie.gewijzigd ? actie.label : null}
                      plaatshouder={actie.label}
                      onBewaar={(v) =>
                        bewaar(actie, { gewijzigd: v !== null, label: v ?? actie.label })
                      }
                    />
                    <span className="block px-2 text-meta text-ink-faint" title={actie.veld}>
                      {actie.veld}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-2 text-ink-muted">
                    {BRON_LABEL[actie.bron] ?? actie.bron}
                    {actie.account && (
                      <span className="block text-meta text-ink-faint">{actie.account}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-2 text-right text-ink">
                    {actie.aantal.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-2 text-ink-muted">
                    {actie.laatstGezien
                      ? new Date(`${actie.laatstGezien}T00:00:00Z`).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Een eigen naam voor de actie.
 *
 * De plaatshouder is het automatisch afgeleide label, dus leeg laten betekent "die naam
 * is prima". Zo hoef je alleen te typen waar de afleiding ernaast zit.
 */
function LabelVeld({
  waarde,
  plaatshouder,
  onBewaar,
}: {
  waarde: string | null;
  plaatshouder: string;
  onBewaar: (waarde: string | null) => void;
}) {
  const [tekst, setTekst] = useState(waarde ?? "");

  useEffect(() => setTekst(waarde ?? ""), [waarde]);

  return (
    <input
      value={tekst}
      placeholder={plaatshouder}
      onChange={(e) => setTekst(e.target.value)}
      onBlur={() => {
        const kaal = tekst.trim();
        if (kaal !== (waarde ?? "")) onBewaar(kaal || null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setTekst(waarde ?? "");
      }}
      className="w-full min-w-48 rounded-control border border-transparent bg-transparent px-2 py-1 text-sm text-ink transition-colors duration-[var(--duur-snel)] placeholder:text-ink-muted hover:border-line focus:border-line focus:bg-card focus:outline-none"
    />
  );
}
