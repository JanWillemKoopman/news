// Contextuele hulp per wizard-stap: twee-drie regels "wat doe je hier en waarom", exact
// waar de analist ze nodig heeft — de volledige handleiding (boek-icoon in de header)
// blijft het naslagwerk, dit is de spiekbrief. Server-renderbaar, geen state.

const STEP_INTROS: Record<string, { what: string; why: string }> = {
  data: {
    what: "Upload alle wekelijkse bronnen in één keer: KPI, spend per kanaal en eventuele controls (CSV of XLSX).",
    why: "Bij elke CSV draaien automatisch een kolom-classificatie en een statistisch profiel — de architect start daardoor met een voorsprong.",
  },
  eda: {
    what: "Verken de data zelf: grafieken, kolomstatistieken en de correlatiematrix — volledig in je browser.",
    why: "Let vooral op sterk samenhangende spend-kanalen (multicollineariteit): die kan het model niet los van elkaar schatten.",
  },
  dataprep: {
    what: "Van losse bestanden naar één schone, wekelijkse master-tabel: rollen toewijzen, samenvoegen, kwaliteitsrapport lezen en goedkeuren.",
    why: "Laat de architect het zware werk doen (automatisch voorbereiden of een recept-voorstel); jij blijft de eindcontrole — er wordt nooit iets stilzwijgend aangepast.",
  },
  config: {
    what: "Vertaal wat je over de klant weet naar modelinstellingen: kanaaltypes, na-ijl (adstock), saturatie, seizoen en het ruismodel.",
    why: "Zakelijke context is de grootste hefboom — vertel de architect over seizoensdrukte, campagnes en offline kanalen vóórdat je fit. Eerste fit: instellingen op standaard en preset 'Snel'.",
  },
  fits: {
    what: "De fit draait asynchroon op de rekenlaag; volg hier de fase en de wachtrij.",
    why: "Zodra een fit klaar is of faalt, meldt de architect zich vanzelf in de chat. Bij een zwakke fit kan de automatische verbetercyclus de correctierondes voor je draaien.",
  },
  results: {
    what: "Beoordeel het resultaat: kwaliteitspoort, bijdragen en ROAS per kanaal (altijd met onzekerheidsmarge), en het budgetadvies.",
    why: "Vertrouw je de uitkomst (poort groen/stil)? Vergelijk met eerdere runs, genereer de analyse of klantsamenvatting, en publiceer pas dan naar het klantdashboard.",
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
