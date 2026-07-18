// Contextuele hulp per wizard-stap: twee-drie regels "wat doe je hier en waarom", exact
// waar de analist ze nodig heeft — de volledige handleiding (boek-icoon in de header)
// blijft het naslagwerk, dit is de spiekbrief. Server-renderbaar, geen state.

const STEP_INTROS: Record<string, { what: string; why: string }> = {
  data: {
    what: "Upload alle wekelijkse bronnen in één keer: KPI, spend per kanaal en eventuele controls (CSV of XLSX).",
    why: "Bij elke CSV draaien automatisch een kolom-classificatie en een statistisch profiel — de AI start daardoor met een voorsprong.",
  },
  dataprep: {
    what: "Van losse bestanden naar één schone, wekelijkse tabel (de definitieve dataset): de AI stelt de samenvoeging voor, jij controleert en keurt goed.",
    why: "Verken desgewenst eerst de data (uitklapbaar paneel bovenaan), en leg per kolom vast wat er zakelijk achter zit — dat maakt elk AI-voorstel beter.",
  },
  config: {
    what: "Vertel eerst wat je over de klant weet (zakelijke context), en vertaal dat naar modelinstellingen: kanaaltypes, na-ijl (adstock), saturatie, seizoen en het ruismodel.",
    why: "Zakelijke context is de grootste hefboom van het model — de AI gebruikt elk vastgelegd feit in zijn voorstellen. Eerste berekening: instellingen op standaard en preset 'Snel'.",
  },
  run: {
    what: "Volg hier de lopende berekening (fase, verstreken tijd, verwachte duur); zodra hij klaar is verschijnt op dezelfde plek het resultaat: kwaliteitscontrole, bijdragen en ROAS per kanaal, en het budgetadvies.",
    why: "Zodra een berekening klaar is of faalt, meldt de AI zich vanzelf in de chat. Vertrouw je de uitkomst? Dan is publiceren naar het klantdashboard de afsluitende stap.",
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
