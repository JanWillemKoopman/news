"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/Drawer";
import { getBrandLogo } from "@/components/brandLogos";
import { IconClose, IconPlus } from "@/components/icons";
import { merkSleutel } from "@/lib/marketingAnalyse/rekenen";
import type { MaMerkMail } from "@/lib/marketingAnalyse/types";

const INVOER =
  "min-w-0 flex-1 rounded-button border border-line bg-surface-tint px-3 py-1.5 text-sm text-ink outline-none focus:border-primary";
const KNOP =
  "whitespace-nowrap rounded-button border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-tint disabled:opacity-50";

/** Eén merk: de adressen als chips, en een regel om er een toe te voegen. */
function MerkRegel({
  merk,
  adressen,
  bezig,
  onToevoegen,
  onVerwijderen,
}: {
  merk: string;
  adressen: MaMerkMail[];
  bezig: string | null;
  onToevoegen: (merk: string, email: string | null) => Promise<boolean>;
  onVerwijderen: (a: MaMerkMail) => void;
}) {
  const [email, setEmail] = useState("");
  const Logo = getBrandLogo(merk);
  const ikStaErin = adressen.some((a) => a.ikZelf);
  const sleutel = merkSleutel(merk) ?? merk;

  return (
    <li className="flex flex-col gap-2.5 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          {Logo ? <Logo className="h-4 w-4 text-ink-muted" /> : <span className="h-4 w-4" />}
          {merk}
        </span>
        <span className="text-meta tabular-nums text-ink-faint">
          {adressen.length === 0 ? "geen adressen" : `${adressen.length} ${adressen.length === 1 ? "adres" : "adressen"}`}
        </span>
      </div>

      {adressen.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {adressen.map((a) => (
            <li
              key={a.id}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-line-soft bg-surface-tint py-0.5 pl-2.5 pr-1 text-meta text-ink"
            >
              <span className="truncate">
                {a.email}
                {a.ikZelf && <span className="ml-1 text-ink-faint">(jij)</span>}
              </span>
              {a.magVerwijderen ? (
                <button
                  type="button"
                  onClick={() => onVerwijderen(a)}
                  disabled={bezig !== null}
                  aria-label={`${a.email} weghalen bij ${merk}`}
                  title="Weghalen"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-card hover:text-negative disabled:opacity-50"
                >
                  <IconClose className="h-3 w-3" />
                </button>
              ) : (
                <span className="w-1" />
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (email.trim() && (await onToevoegen(merk, email.trim()))) setEmail("");
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mailadres toevoegen"
          aria-label={`E-mailadres toevoegen bij ${merk}`}
          className={INVOER}
        />
        <button type="submit" disabled={bezig !== null || !email.trim()} className={KNOP}>
          {bezig === `toevoegen:${sleutel}` ? "Toevoegen…" : "Toevoegen"}
        </button>
        {!ikStaErin && (
          <button
            type="button"
            onClick={() => onToevoegen(merk, null)}
            disabled={bezig !== null}
            title={`Je eigen adres toevoegen bij ${merk}`}
            className={KNOP}
          >
            {bezig === `zelf:${sleutel}` ? "Bezig…" : "Mijzelf"}
          </button>
        )}
      </form>
    </li>
  );
}

/**
 * E-mail settings: per automerk de adressen die standaard een mail krijgen bij een nieuwe analyse
 * voor dat merk. Bij een nieuwe analyse (of een ander merk in de briefing) worden ze volgers van
 * die analyse; een adres dat je hier toevoegt komt ook meteen bij de lopende analyses van het merk.
 */
export default function MerkMailZijbalk({ onClose, onGewijzigd }: { onClose: () => void; onGewijzigd: () => void }) {
  const [merken, setMerken] = useState<string[] | null>(null);
  const [adressen, setAdressen] = useState<MaMerkMail[]>([]);
  const [nieuwMerk, setNieuwMerk] = useState("");
  const [bezig, setBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  useEffect(() => {
    let actief = true;
    fetch("/api/marketing-analyse/merk-mail")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { merken?: string[]; adressen?: MaMerkMail[]; fout?: string };
        if (!res.ok || !data.merken) throw new Error(data.fout ?? "Kon de e-mail settings niet laden.");
        if (!actief) return;
        setMerken(data.merken);
        setAdressen(data.adressen ?? []);
      })
      .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)));
    return () => {
      actief = false;
    };
  }, []);

  async function voegToe(merk: string, email: string | null): Promise<boolean> {
    const sleutel = merkSleutel(merk) ?? merk;
    setBezig(`${email === null ? "zelf" : "toevoegen"}:${sleutel}`);
    setFout(null);
    setMelding(null);
    try {
      const res = await fetch("/api/marketing-analyse/merk-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(email === null ? { merk } : { merk, email }),
      });
      const data = (await res.json().catch(() => ({}))) as { adres?: MaMerkMail; toegevoegdAanAnalyses?: number; fout?: string };
      if (!res.ok || !data.adres) throw new Error(data.fout ?? "Kon het adres niet toevoegen.");
      const nieuw = data.adres;
      setAdressen((lijst) => [...lijst.filter((a) => a.id !== nieuw.id), nieuw]);
      const n = data.toegevoegdAanAnalyses ?? 0;
      if (n > 0) {
        setMelding(`${nieuw.email} staat nu ook bij ${n} lopende ${n === 1 ? "analyse" : "analyses"} van ${nieuw.merk}.`);
        onGewijzigd();
      }
      return true;
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBezig(null);
    }
  }

  async function verwijder(a: MaMerkMail) {
    setBezig(a.id);
    setFout(null);
    setMelding(null);
    try {
      const res = await fetch(`/api/marketing-analyse/merk-mail?id=${encodeURIComponent(a.id)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { fout?: string };
      if (!res.ok) throw new Error(data.fout ?? "Kon het adres niet weghalen.");
      setAdressen((lijst) => lijst.filter((x) => x.id !== a.id));
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(null);
    }
  }

  function voegMerkToe() {
    const naam = nieuwMerk.trim();
    const sleutel = merkSleutel(naam);
    if (!sleutel || !merken) return;
    if (!merken.some((m) => merkSleutel(m) === sleutel)) setMerken([...merken, naam]);
    setNieuwMerk("");
  }

  const perMerk = new Map<string, MaMerkMail[]>();
  for (const a of adressen) {
    const s = merkSleutel(a.merk) ?? a.merk;
    perMerk.set(s, [...(perMerk.get(s) ?? []), a]);
  }

  return (
    <Drawer title="E-mail settings" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          Per merk de adressen die standaard een mail krijgen bij een nieuwe analyse. Komt er een analyse voor een merk bij, dan
          staan deze adressen er meteen als volger bij. Een adres dat je hier toevoegt, komt ook bij de lopende analyses van dat
          merk. Weghalen bij een merk haalt het niet weg bij analyses; dat doe je via het mail-icoontje in het overzicht.
        </p>

        {merken === null && !fout && <p className="text-sm text-ink-faint">Laden…</p>}

        {merken && (
          <ul className="divide-y divide-line-soft rounded-card border border-line-soft">
            {merken.map((m) => (
              <MerkRegel
                key={merkSleutel(m) ?? m}
                merk={m}
                adressen={perMerk.get(merkSleutel(m) ?? m) ?? []}
                bezig={bezig}
                onToevoegen={voegToe}
                onVerwijderen={verwijder}
              />
            ))}
          </ul>
        )}

        {merken && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              voegMerkToe();
            }}
          >
            <input
              value={nieuwMerk}
              onChange={(e) => setNieuwMerk(e.target.value)}
              placeholder="Ander merk"
              aria-label="Ander merk toevoegen"
              maxLength={80}
              className={INVOER}
            />
            <button type="submit" disabled={!merkSleutel(nieuwMerk)} className={`${KNOP} flex items-center gap-1.5`}>
              <IconPlus className="h-4 w-4 text-ink-muted" />
              Merk toevoegen
            </button>
          </form>
        )}

        {melding && <p className="text-sm text-positive">{melding}</p>}
        {fout && <p className="text-sm text-negative">{fout}</p>}
      </div>
    </Drawer>
  );
}
