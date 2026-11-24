"use client";

import { useEffect, useState } from "react";
import type { MaVolger } from "@/lib/marketingAnalyse/types";

/**
 * Volgers van een campagne: wie een mail krijgt zodra er een nieuwe analyse staat. Jezelf
 * aanmelden kan met één klik (het adres van je account); een ander adres toevoegen ook.
 * Afmelden kan hier of via de link onderaan elke mail.
 */
export default function VolgersBlok({ campagneId }: { campagneId: string }) {
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
        if (actief) setVolgers(data.volgers);
      })
      .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)));
    return () => {
      actief = false;
    };
  }, [basis]);

  const ik = volgers?.find((v) => v.ikZelf) ?? null;

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
      setVolgers((oud) => [...(oud ?? []).filter((v) => v.id !== nieuw.id), nieuw]);
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
      setVolgers((oud) => (oud ?? []).filter((x) => x.id !== v.id));
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(null);
    }
  }

  return (
    <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="label-theme text-label text-ink-muted">Mail bij een nieuwe analyse</h2>
          <p className="mt-1 max-w-[80ch] text-meta text-ink-faint">
            Wie hier staat, krijgt een mail met de samenvatting en een link zodra er een nieuwe versie van deze analyse klaarstaat.
          </p>
        </div>
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

      {volgers === null && !fout && <p className="mt-3 text-sm text-ink-faint">Laden…</p>}

      {volgers && volgers.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {volgers.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-1.5 rounded-full border border-line-soft bg-surface-tint py-1 pl-3 pr-1.5 text-sm text-ink"
            >
              <span>{v.email}</span>
              {v.ikZelf && <span className="text-meta text-ink-faint">(jij)</span>}
              {v.magVerwijderen && (
                <button
                  type="button"
                  onClick={() => verwijder(v)}
                  disabled={bezig !== null}
                  aria-label={`${v.email} weghalen`}
                  title="Weghalen"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-line-soft hover:text-ink disabled:opacity-50"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {volgers && volgers.length === 0 && <p className="mt-3 text-sm text-ink-faint">Nog niemand volgt deze campagne.</p>}

      {volgers && (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
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

      {fout && <p className="mt-2 text-sm text-negative">{fout}</p>}
    </section>
  );
}
