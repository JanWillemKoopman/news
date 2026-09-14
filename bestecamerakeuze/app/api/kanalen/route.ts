import { NextResponse } from "next/server";
import {
  haalAccounts,
  haalAdvertenties,
  haalBudgetten,
  haalKoppelingen,
  haalSheetKoppelingen,
  haalSyncStand,
  haalPosts,
  isKanalenGeconfigureerd,
  type BudgetVraag,
} from "@/lib/kanalen/bron";
import { getGebruiker } from "@/lib/auth";
import { getCampagnes } from "@/lib/sheet";

export const dynamic = "force-dynamic";

/**
 * De data achter de vijf Kanalen-pagina's.
 *
 * Eén route voor alle vijf, omdat ze hetzelfde patroon volgen: kies een pagina en een
 * periode, krijg de kubus terug. De pagina filtert daarna zelf in het geheugen — dat is
 * waarom hier geen filterparameters staan. Zou het filteren hier gebeuren, dan kostte
 * elke klik op een filter een netwerkronde, en precies dat moest het niet worden.
 *
 * De data verandert maar één keer per nacht, dus het antwoord mag ruim gecachet worden.
 * `stale-while-revalidate` zorgt dat de eerste bezoeker na de sync de oude versie krijgt
 * en de verse op de achtergrond wordt opgehaald, in plaats van te moeten wachten.
 */

const PAGINAS = ["social", "google", "betaald", "organisch", "account", "koppeltabel"] as const;
type Pagina = (typeof PAGINAS)[number];

const CACHE = "private, max-age=300, stale-while-revalidate=3600";

function datumOf(waarde: string | null, terugval: Date): string {
  if (waarde && /^\d{4}-\d{2}-\d{2}$/.test(waarde)) return waarde;
  return terugval.toISOString().slice(0, 10);
}

/**
 * De campagnes waarvan we én een budget uit de sheet kennen én de looptijd.
 *
 * De koppeling loopt over `sheet_campagne` in de koppeltabel: de campagnenaam in een
 * advertentieplatform is zelden dezelfde als die in de sheet, en dat handmatig leggen is
 * precies waar die pagina voor bestaat. Zonder start- en einddatum valt er niets te
 * peilen — dan weet je niet hoever de campagne is.
 */
async function haalBudgetVragen(): Promise<BudgetVraag[]> {
  // Eerst de koppeltabel, dán pas de sheet. Die tweede is een externe fetch zonder cache,
  // en die hoort niet bij elke ophaalactie te lopen als er nog geen enkele campagne aan
  // een sheet-campagne hangt — wat op dit moment de stand is.
  const koppelingen = await haalSheetKoppelingen();
  if (koppelingen.length === 0) return [];

  const campagnes = await getCampagnes();
  const uitSheet = new Map(campagnes.map((c) => [c.naam, c]));

  return koppelingen.flatMap((koppeling) => {
    const sheet = uitSheet.get(koppeling.sheetCampagne);
    if (!sheet?.startdatum || !sheet.einddatum) return [];
    if (sheet.budget === null && sheet.doelLeads === null) return [];
    return [
      {
        campagne: koppeling.campagne,
        sheetCampagne: koppeling.sheetCampagne,
        budget: sheet.budget,
        doelLeads: sheet.doelLeads,
        startdatum: sheet.startdatum,
        einddatum: sheet.einddatum,
      },
    ];
  });
}

export async function GET(request: Request) {
  // Kanaaldata is bedrijfsdata: wie niet is ingelogd, krijgt hem niet. Hetzelfde
  // uitgangspunt als bij de aantekeningen en het kostentabblad.
  const gebruiker = await getGebruiker();
  if (!gebruiker) {
    return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  }

  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json(
      { fout: "DATAQUERY_DATABASE_URL ontbreekt — de kanaaldata is niet aangesloten." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const paginaParam = url.searchParams.get("pagina");
  const pagina = (PAGINAS as readonly string[]).includes(paginaParam ?? "")
    ? (paginaParam as Pagina)
    : "social";

  const vandaag = new Date();
  const dertigTerug = new Date(vandaag);
  dertigTerug.setUTCDate(dertigTerug.getUTCDate() - 29);

  const van = datumOf(url.searchParams.get("van"), dertigTerug);
  const tot = datumOf(url.searchParams.get("tot"), vandaag);

  try {
    const stand = await haalSyncStand().catch(() => ({ laatsteSync: null, loopt: false }));
    const { laatsteSync, loopt: syncLoopt } = stand;

    if (pagina === "koppeltabel") {
      const [koppelingen, campagnesUitSheet] = await Promise.all([
        haalKoppelingen(),
        getCampagnes()
          .then((c) => c.map((r) => r.naam))
          .catch(() => []),
      ]);
      return NextResponse.json(
        { pagina, koppelingen, campagnesUitSheet, laatsteSync, syncLoopt },
        { headers: { "Cache-Control": CACHE } },
      );
    }

    if (pagina === "organisch") {
      const data = await haalPosts(van, tot);
      return NextResponse.json({ pagina, ...data, laatsteSync, syncLoopt }, { headers: { "Cache-Control": CACHE } });
    }

    if (pagina === "account") {
      const data = await haalAccounts(van, tot);
      return NextResponse.json({ pagina, ...data, laatsteSync, syncLoopt }, { headers: { "Cache-Control": CACHE } });
    }

    const [data, budgetten] = await Promise.all([
      haalAdvertenties(
        pagina === "google" ? "google" : pagina === "betaald" ? "betaald" : "social",
        van,
        tot,
      ),
      // Best-effort: de sheet is een externe fetch en het budgetblok is een toevoeging.
      // Valt hij weg, dan staan de cijfers er gewoon zonder pacing eronder.
      haalBudgetVragen().then(haalBudgetten).catch(() => []),
    ]);
    return NextResponse.json(
      { pagina, ...data, budgetten, laatsteSync, syncLoopt },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
