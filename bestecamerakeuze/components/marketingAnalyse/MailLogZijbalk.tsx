"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/Drawer";
import { LabelBadge } from "@/components/marketingAnalyse/onderdelen";
import { filterMails, type MailStatus, type MaMailRegel } from "@/lib/marketingAnalyse/mailLog";

const STATUS: Record<MailStatus, { naam: string; kleur: string }> = {
  verstuurd: { naam: "Verstuurd", kleur: "bg-positive" },
  mislukt: { naam: "Mislukt", kleur: "bg-negative" },
  "adressen-onbekend": { naam: "Verstuurd", kleur: "bg-positive" },
  "geen-volgers": { naam: "Geen mail", kleur: "bg-closed" },
  "niet-verstuurd": { naam: "Niet verstuurd", kleur: "bg-orange" },
};

const TIJD = new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Verzonden e-mails (migratie 0050, alleen de eigenaar): per adres wie wanneer welke analyse per
 * mail kreeg, nieuwste eerst. Versies zonder mail staan er ook in, met de reden. Zoeken gaat op
 * adres of campagne; een klik op de analyse opent hem.
 */
export default function MailLogZijbalk({ onClose, onOpen }: { onClose: () => void; onOpen: (campagneId: string) => void }) {
  const [regels, setRegels] = useState<MaMailRegel[] | null>(null);
  const [afgekapt, setAfgekapt] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [zoek, setZoek] = useState("");

  useEffect(() => {
    fetch("/api/marketing-analyse/mails", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { regels?: MaMailRegel[]; afgekapt?: boolean; fout?: string };
        if (!res.ok || !data.regels) throw new Error(data.fout ?? "Kon de verzonden e-mails niet laden.");
        setRegels(data.regels);
        setAfgekapt(Boolean(data.afgekapt));
      })
      .catch((err) => setFout(err instanceof Error ? err.message : String(err)));
  }, []);

  const zichtbaar = regels ? filterMails(regels, zoek) : [];
  const verstuurd = zichtbaar.filter((r) => r.status === "verstuurd").length;
  const mislukt = zichtbaar.filter((r) => r.status === "mislukt").length;
  const adressen = new Set(zichtbaar.filter((r) => r.status === "verstuurd").map((r) => r.email)).size;

  return (
    <Drawer title="Verzonden e-mails" onClose={onClose} extraBreed>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          Wie wanneer welke analyse per mail kreeg, nieuwste eerst. Per adres bijgehouden sinds 25 november 2026; van eerdere
          mails staat alleen het aantal erbij. Een analyse zonder mail staat er ook, met de reden.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek op e-mailadres of campagne"
            aria-label="Zoek op e-mailadres of campagne"
            className="w-80 rounded-control border border-line bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-primary"
          />
          {regels && (
            <p className="text-meta text-ink-faint">
              <span className="font-medium text-ink">{verstuurd}</span> {verstuurd === 1 ? "mail" : "mails"} verstuurd aan{" "}
              <span className="font-medium text-ink">{adressen}</span> {adressen === 1 ? "adres" : "adressen"}
              {mislukt > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-negative">{mislukt} mislukt</span>
                </>
              )}
            </p>
          )}
        </div>

        {fout && <p className="text-sm text-negative">{fout}</p>}
        {!regels && !fout && <p className="text-sm text-ink-muted">Laden…</p>}
        {regels && zichtbaar.length === 0 && (
          <p className="rounded-card border border-line-soft bg-surface-tint px-4 py-6 text-center text-sm text-ink-muted">
            {zoek.trim() ? "Niets gevonden voor deze zoekterm." : "Er zijn nog geen analyses gemaakt."}
          </p>
        )}

        {zichtbaar.length > 0 && (
          <div className="overflow-x-auto rounded-card border border-line-soft">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-label text-ink-faint">
                  <th className="label-theme whitespace-nowrap px-4 py-2.5 font-normal">Verstuurd op</th>
                  <th className="label-theme whitespace-nowrap px-4 py-2.5 font-normal">Aan</th>
                  <th className="label-theme whitespace-nowrap px-4 py-2.5 font-normal">Analyse</th>
                  <th className="label-theme whitespace-nowrap px-4 py-2.5 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {zichtbaar.map((r) => (
                  <tr key={r.id} className="align-top [&>td]:border-t [&>td]:border-line-soft">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink">{TIJD.format(new Date(r.op))}</td>
                    <td className="px-4 py-3">
                      {r.email ? <span className="break-all text-ink">{r.email}</span> : <span className="text-ink-faint">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {r.campagneId ? (
                          <button
                            type="button"
                            onClick={() => onOpen(r.campagneId as string)}
                            className="text-left font-medium text-ink underline-offset-2 hover:underline"
                            title="Analyse openen"
                          >
                            {r.campagneNaam}
                          </button>
                        ) : (
                          <span className="font-medium text-ink" title="Deze analyse bestaat niet meer">
                            {r.campagneNaam}
                          </span>
                        )}
                        <span className="text-meta text-ink-faint">v{r.versie}</span>
                        <LabelBadge label={r.label} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink">
                        <span className={`h-2 w-2 rounded-full ${STATUS[r.status].kleur}`} aria-hidden />
                        {STATUS[r.status].naam}
                      </span>
                      {r.toelichting && <p className="mt-0.5 max-w-xs text-meta text-ink-faint">{r.toelichting}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {afgekapt && <p className="text-meta text-ink-faint">Alleen de laatste 2.000 mails staan erin.</p>}
      </div>
    </Drawer>
  );
}
