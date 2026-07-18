// Contextuele hulp per wizard-stap: twee-drie regels "wat doe je hier en waarom", exact
// waar de analist ze nodig heeft — de volledige handleiding (boek-icoon in de header)
// blijft het naslagwerk, dit is de spiekbrief. Server-renderbaar, geen state.

const STEP_INTROS: Record<string, { what: string; why: string }> = {
  data: {
    what: "Upload alle wekelijkse bronnen in één keer: KPI, spend per kanaal en eventuele controls (CSV of XLSX).",
    why: "Bij elke CSV draaien automatisch een kolom-classificatie en een statistisch profiel — de AI start daardoor met een voorsprong.",
  },
  eda: {
    what: "Verken de data zelf: grafieken, kolomstatistieken en de correlatiematrix — volledig in je browser.",
    why: "Let vooral op sterk samenhangende spend-kanalen (multicollineariteit): die kan het model niet los van elkaar schatten.",
  },
  dataprep: {
    what: "Van losse bestanden naar één schone, wekelijkse tabel (de definitieve dataset): de AI stelt de samenvoeging voor, jij controleert en keurt goed.",
    why: "Laat de AI het zware werk doen (automatisch voorbereiden of een voorstel); jij blijft de eindcontrole — er wordt nooit iets stilzwijgend aangepast.",
  },
  config: {
    what: "Vertaal wat je over de klant weet naar modelinstellingen: kanaaltypes, na-ijl (adstock), saturatie, seizoen en het ruismodel.",
    why: "Zakelijke context is de grootste hefboom — vertel de AI over seizoensdrukte, campagnes en offline kanalen vóórdat je het model draait. Eerste berekening: instellingen op standaard en preset 'Snel'.",
  },
  fits: {
    what: "De berekening draait op de achtergrond; volg hier de fase, de verstreken tijd en de verwachte duur.",
    why: "Zodra een berekening klaar is of faalt, meldt de AI zich vanzelf in de chat. Bij een zwak resultaat kan de automatische verbetercyclus de correctierondes voor je draaien.",
  },
  results: {
    what: "Beoordeel het resultaat: kwaliteitscontrole, bijdragen en ROAS per kanaal (altijd met onzekerheidsmarge), en het budgetadvies.",
    why: "Vertrouw je de uitkomst (kwaliteitscontrole groen)? Vergelijk met eerdere runs, genereer de analyse of klantsamenvatting, en publiceer pas dan naar het klantdashboard.",
  },
};

export function StepIntro({ step }: { step: string }) {
  const intro = STEP_INTROS[step];
  if (!intro) return null;
  return (
    <div className="mb-4 rounded-lg border border-border bg-surface-2/60 px-3 py-2.5 text-xs leading-relaxed text-fg-muted">
      <p>{intro.what}</p>
      <p className="mt-1 text-fg-faint">
        {intro.why} <span className="text-fg-faint">Meer detail: de handleiding (boek-icoon rechtsboven).</span>
      </p>
    </div>
  );
}
