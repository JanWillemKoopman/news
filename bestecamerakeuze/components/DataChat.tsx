"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Weergave } from "@/components/chat/Visual";

/**
 * De grafiekbibliotheek wordt pas geladen zodra er echt een visual getoond wordt.
 * Zonder deze splitsing draagt iedereen die alleen de campagnetabel bekijkt ~125 kB
 * aan grafiekcode mee voor een tabblad dat hij niet opent.
 */
const Visual = dynamic(() => import("@/components/chat/Visual"), {
  ssr: false,
  loading: () => (
    <div className="mt-1 mb-4 h-40 rounded-panel border border-line bg-surface" />
  ),
});

/**
 * Het chatvenster. Streamt het antwoord binnen als NDJSON en toont onder elk antwoord
 * de verantwoording: welke query is gedraaid, hoeveel rijen die opleverde en hoe lang
 * hij duurde. Dat laatste is geen extraatje — zonder de query erbij kan niemand
 * controleren of een cijfer klopt, en dan wordt de chat niet gebruikt voor besluiten.
 */

interface QueryVerslag {
  sql: string;
  toelichting: string;
  aantalRijen: number | null;
  duurMs: number | null;
  fout: string | null;
  kolommen: string[];
  rijen: Record<string, unknown>[];
  weergave: Weergave;
}

interface Bericht {
  rol: "gebruiker" | "assistent";
  tekst: string;
  queries?: QueryVerslag[];
}

const VOORBEELDVRAGEN = [
  "Hoeveel auto's van het merk DAF zijn verkocht in week 40 van 2025?",
  "Wat was de omzet per merk vorig kwartaal?",
  "Welke orders zijn wel getekend maar nog niet afgeleverd?",
];

function ResultaatTabel({ verslag }: { verslag: QueryVerslag }) {
  if (verslag.rijen.length === 0 || verslag.kolommen.length === 0) return null;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            {verslag.kolommen.map((k) => (
              <th
                key={k}
                className="border-b border-line bg-accent px-3 py-2 text-left font-sans-w7 text-xs font-semibold tracking-wide text-ink uppercase"
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {verslag.rijen.slice(0, 25).map((rij, i) => (
            <tr key={i} className={i % 2 === 1 ? "bg-surface" : "bg-card"}>
              {verslag.kolommen.map((k) => (
                <td key={k} className="px-3 py-2 text-ink tabular-nums">
                  {rij[k] === null || rij[k] === undefined ? "—" : String(rij[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {verslag.rijen.length > 25 && (
        <p className="mt-2 text-xs text-ink-faint">
          Eerste 25 van {verslag.rijen.length} getoonde rijen.
        </p>
      )}
    </div>
  );
}

function Verantwoording({ queries }: { queries: QueryVerslag[] }) {
  if (queries.length === 0) return null;
  return (
    <details className="mt-3 rounded-card border border-line bg-surface px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-ink-muted">
        Verantwoording — {queries.length}{" "}
        {queries.length === 1 ? "query" : "queries"} uitgevoerd
      </summary>
      <div className="mt-3 flex flex-col gap-4">
        {queries.map((q, i) => (
          <div key={i}>
            <p className="text-sm text-ink-muted">{q.toelichting}</p>
            <pre className="mt-1.5 overflow-x-auto rounded-card bg-card p-3 text-xs leading-relaxed text-ink">
              {q.sql}
            </pre>
            <p className="mt-1.5 text-xs text-ink-faint">
              {q.fout ? (
                <span className="text-orange">Mislukt: {q.fout}</span>
              ) : (
                <>
                  {q.aantalRijen} {q.aantalRijen === 1 ? "rij" : "rijen"} · {q.duurMs} ms
                </>
              )}
            </p>
            {!q.fout && q.weergave.vorm !== "tabel" && <ResultaatTabel verslag={q} />}
          </div>
        ))}
      </div>
    </details>
  );
}

export default function DataChat({ ingelogd }: { ingelogd: boolean }) {
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fase, setFase] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const onderkant = useRef<HTMLDivElement>(null);

  async function verstuur(vraag: string) {
    if (!vraag.trim() || bezig) return;
    setFout(null);
    setInvoer("");
    setBezig(true);
    setFase("denken");

    const geschiedenis = berichten.map((b) => ({ rol: b.rol, tekst: b.tekst }));
    setBerichten((b) => [...b, { rol: "gebruiker", tekst: vraag }]);

    let lopendAntwoord = "";
    const lopendeQueries: QueryVerslag[] = [];
    // Plaatshouder voor het antwoord dat binnenstroomt.
    setBerichten((b) => [...b, { rol: "assistent", tekst: "", queries: [] }]);

    const werkAntwoordBij = () =>
      setBerichten((b) => {
        const kopie = [...b];
        kopie[kopie.length - 1] = {
          rol: "assistent",
          tekst: lopendAntwoord,
          queries: [...lopendeQueries],
        };
        return kopie;
      });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vraag, geschiedenis }),
      });

      if (!res.ok || !res.body) {
        const bericht = await res
          .json()
          .then((j: { fout?: string }) => j.fout)
          .catch(() => null);
        throw new Error(bericht ?? `Er ging iets mis (status ${res.status}).`);
      }

      const lezer = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await lezer.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const regels = buffer.split("\n");
        buffer = regels.pop() ?? "";

        for (const regel of regels) {
          if (!regel.trim()) continue;
          const gebeurtenis = JSON.parse(regel) as
            | { type: "fase"; fase: string }
            | { type: "tekst"; tekst: string }
            | ({ type: "query" } & QueryVerslag)
            | { type: "klaar"; antwoord: string; queries: QueryVerslag[] }
            | { type: "fout"; fout: string };

          if (gebeurtenis.type === "fase") {
            setFase(gebeurtenis.fase);
          } else if (gebeurtenis.type === "tekst") {
            lopendAntwoord += gebeurtenis.tekst;
            werkAntwoordBij();
          } else if (gebeurtenis.type === "query") {
            const { type: _type, ...verslag } = gebeurtenis;
            lopendeQueries.push(verslag);
            werkAntwoordBij();
          } else if (gebeurtenis.type === "klaar") {
            lopendAntwoord = gebeurtenis.antwoord;
            lopendeQueries.splice(0, lopendeQueries.length, ...gebeurtenis.queries);
            werkAntwoordBij();
          } else if (gebeurtenis.type === "fout") {
            throw new Error(gebeurtenis.fout);
          }
        }
      }
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis.");
      // Lege plaatshouder weghalen als er niets is binnengekomen.
      setBerichten((b) =>
        b[b.length - 1]?.rol === "assistent" && b[b.length - 1]?.tekst === ""
          ? b.slice(0, -1)
          : b,
      );
    } finally {
      setBezig(false);
      setFase(null);
      onderkant.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  if (!ingelogd) {
    return (
      <div className="rounded-panel border border-line bg-surface p-8 text-center">
        <p className="font-sans-w7 text-lg font-bold text-ink">Log in om te chatten</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          Deze data is niet openbaar. Log in met je werkmail om vragen te kunnen stellen.
        </p>
        <a
          href="/login"
          className="mt-5 inline-block rounded-pill bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          Inloggen
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {berichten.length === 0 && (
        <div className="rounded-panel border border-line bg-surface p-6">
          <p className="font-sans-w7 text-base font-bold text-ink">
            Stel een vraag over je data
          </p>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">
            Je krijgt antwoord op basis van echte queries op de database. Onder elk
            antwoord zie je welke query is gedraaid, zodat je het kunt narekenen.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {VOORBEELDVRAGEN.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => verstuur(v)}
                className="rounded-pill border border-line bg-card px-3.5 py-1.5 text-left text-sm text-ink transition-colors hover:border-primary"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {berichten.map((bericht, i) => (
        <div key={i}>
          {bericht.rol === "gebruiker" ? (
            <div className="flex justify-end">
              <p className="max-w-2xl rounded-panel bg-primary px-4 py-2.5 text-white">
                {bericht.tekst}
              </p>
            </div>
          ) : (
            <div className="rounded-panel border border-line bg-card p-5">
              {/* De weergave komt boven de tekst: het antwoord is het beeld, de tekst
                  legt uit wat je erin ziet. */}
              {bericht.queries
                ?.filter((q) => !q.fout && q.weergave.vorm !== "verberg")
                .map((q, j) => (
                  <Visual
                    key={j}
                    weergave={q.weergave}
                    kolommen={q.kolommen}
                    rijen={q.rijen}
                  />
                ))}
              <p className="whitespace-pre-wrap leading-relaxed text-ink">
                {bericht.tekst || (bezig ? "…" : "")}
              </p>
              {bericht.queries && bericht.queries.length > 0 && (
                <Verantwoording queries={bericht.queries} />
              )}
            </div>
          )}
        </div>
      ))}

      {bezig && (
        <p className="text-sm text-ink-faint">
          {fase === "query"
            ? "Query uitvoeren…"
            : fase === "schrijven"
              ? "Antwoord schrijven…"
              : "Nadenken…"}
        </p>
      )}

      {fout && (
        <p className="rounded-card border border-orange bg-card px-4 py-3 text-sm text-orange">
          {fout}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          verstuur(invoer);
        }}
        className="sticky bottom-4 flex gap-2"
      >
        <input
          value={invoer}
          onChange={(e) => setInvoer(e.target.value)}
          placeholder="Bijvoorbeeld: hoeveel DAF's zijn er vorige maand verkocht?"
          disabled={bezig}
          className="flex-1 rounded-pill border border-line bg-card px-5 py-3 text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={bezig || !invoer.trim()}
          className="rounded-pill bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
        >
          Vraag
        </button>
      </form>
      <div ref={onderkant} />
    </div>
  );
}
