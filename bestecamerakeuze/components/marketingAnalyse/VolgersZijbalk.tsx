"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/Drawer";
import { IconTrash } from "@/components/icons";
import type { MaVolger } from "@/lib/marketingAnalyse/types";

/**
 * Volgers van een analyse, in een zijbalk die opent vanaf het mail-icoontje in het overzicht:
 * wie een mail krijgt zodra er een nieuwe versie staat. Jezelf aanmelden kan met één klik (het
 * adres van je account); een ander adres toevoegen ook. Afmelden kan hier of via de link
 * onderaan elke mail.
 */
export default function VolgersZijbalk({
  campagneId,
  naam,
  onAantal,
  onClose,
}: {
  campagneId: string;
  naam: string;
  /** Het aantal volgers na elke wijziging, voor het getal naast het icoontje. */
  onAantal: (aantal: number) => void;
  onClose: () => void;
}) {
  const [volgers, setVolgers] = useState<MaVolger[] | null>(null);
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const basis = `/api/marketing-analyse/volgers?campagne=${encodeURIComponent(campagneId)}`;

  useEffect(() => {
    let actief = true;
    setVolgers(null);
    fetch(basis)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { volgers?: MaVolger[]; fout?: string };
        if (!res.ok || !data.volgers) throw new Error(data.fout ?? "Kon de volgers niet laden.");
        if (actief) zetVolgers(data.volgers);
      })
      .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)));
    return () => {
      actief = false;
    };
  }, [basis]);

  const ik = volgers?.find((v) => v.ikZelf) ?? null;

  function zetVolgers(lijst: MaVolger[]) {
    setVolgers(lijst);
    onAantal(lijst.length);
  }

  async function voegToe(adres: string | null) {
    setBezig(adres === null ? "zelf" : "toevoegen");
    setFout(null);
    try {
      const res = await fetch(basis, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adres === null ? {} : { email: adres }),
      });
      const data = (await res.json().catch(() => ({}))) as { volger?: MaVolger; fout?: string };
      if (!res.ok || !data.volger) throw new Error(data.fout ?? "Kon het adres niet toevoegen.");
      const nieuw = data.volger;
      zetVolgers([...(volgers ?? []).filter((v) => v.id !== nieuw.id), nieuw]);
      if (adres !== null) setEmail("");
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(null);
    }
  }

  async function verwijder(v: MaVolger) {
    setBezig(v.id);
    setFout(null);
    try {
      const res = await fetch(`${basis}&id=${encodeURIComponent(v.id)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { fout?: string };
      if (!res.ok) throw new Error(data.fout ?? "Kon het adres niet weghalen.");
      zetVolgers((volgers ?? []).filter((x) => x.id !== v.id));
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(null);
    }
  }

  return (
    <Drawer title={`Mail bij een nieuwe analyse — ${naam}`} onClose={onClose}>
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-ink-muted">
          Wie hier staat, krijgt een mail met de samenvatting en een link zodra er een nieuwe versie van deze analyse klaarstaat.
          Afmelden kan ook via de link onderaan elke mail.
        </p>
        {volgers && (
          <button
            type="button"
            onClick={() => (ik ? verwijder(ik) : voegToe(null))}
            disabled={bezig !== null}
            className={
              ik
                ? "rounded-button border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-tint disabled:opacity-50"
                : "rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-50"
            }
          >
            {bezig === "zelf" || (ik && bezig === ik.id) ? "Bezig…" : ik ? "Niet meer volgen" : "Volg deze campagne"}
          </button>
        )}
      </div>

      {volgers === null && !fout && <p className="text-sm text-ink-faint">Laden…</p>}

      {volgers && volgers.length > 0 && (
        <ul className="divide-y divide-line-soft rounded-card border border-line-soft">
          {volgers.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-ink">
              <span className="min-w-0 truncate">
                {v.email}
                {v.ikZelf && <span className="ml-1.5 text-meta text-ink-faint">(jij)</span>}
                {v.viaMerk && (
                  <span className="ml-1.5 text-meta text-ink-faint" title={`Standaard voor ${v.viaMerk} (E-mail settings)`}>
                    via {v.viaMerk}
                  </span>
                )}
              </span>
              {v.magVerwijderen && (
                <button
                  type="button"
                  onClick={() => verwijder(v)}
                  disabled={bezig !== null}
                  aria-label={`${v.email} verwijderen`}
                  title="Verwijderen"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-ink-faint transition-colors hover:bg-surface hover:text-negative disabled:opacity-50"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {volgers && volgers.length === 0 && <p className="text-sm text-ink-faint">Nog niemand volgt deze analyse.</p>}

      {volgers && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) voegToe(email.trim());
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ander e-mailadres toevoegen"
            aria-label="E-mailadres toevoegen"
            className="min-w-0 flex-1 basis-56 rounded-button border border-line bg-surface-tint px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={bezig !== null || !email.trim()}
            className="rounded-button border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-tint disabled:opacity-50"
          >
            {bezig === "toevoegen" ? "Toevoegen…" : "Toevoegen"}
          </button>
        </form>
      )}

      {fout && <p className="text-sm text-negative">{fout}</p>}
    </div>
    </Drawer>
  );
}
