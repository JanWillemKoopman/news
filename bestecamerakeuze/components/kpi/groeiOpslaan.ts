import type { KpiTabblad } from "@/lib/kpi2027/groeiInvoer";

/**
 * Bewaart het groeipercentage van één KPI (`POST /api/kpi-2027/groei`); null = terug naar
 * de standaard. Gooit een fout met de melding van de server, zodat de kaart hem kan tonen.
 */
export async function slaGroeiOp(rij: {
  tabblad: KpiTabblad;
  website: string;
  kpi: string;
  groei: number | null;
}): Promise<void> {
  const res = await fetch("/api/kpi-2027/groei", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rij),
  });
  if (!res.ok) {
    const antwoord = (await res.json().catch(() => ({}))) as { fout?: string };
    throw new Error(antwoord.fout ?? `Opslaan mislukt (${res.status}).`);
  }
}
