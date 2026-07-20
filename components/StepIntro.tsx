// Contextuele hulp per wizard-stap: twee-drie regels "wat doe je hier en waarom", exact
// waar de analist ze nodig heeft — de volledige handleiding (boek-icoon in de header)
// blijft het naslagwerk, dit is de spiekbrief. Server-renderbaar, geen state.

const STEP_INTROS: Record<string, { what: string; why: string }> = {
  data: {
    what: "Upload alle wekelijkse bronnen in één keer: KPI, spend per kanaal en eventuele controls (CSV of XLSX).",
    why: "Bij elke CSV draaien automatisch een kolom-classificatie en een statistisch profiel — de AI start daardoor met een voorsprong.",
  },
  dataprep: {
    what: "Van losse bestanden naar één schone, wekelijkse tabel (de definitieve dataset) in vier substappen: verken (2a, optioneel), voeg samen (2b), controleer (2c) en keur goed (2d).",
    why: "Werk de substappen van boven naar beneden af — de actieve substap klapt vanzelf open. De AI stelt de samenvoeging voor; jij controleert en keurt goed.",
  },
  config: {
    what: "Twee substappen: leg vast wat je over de klant weet (3a, zakelijke context) en vertaal dat naar modelinstellingen en de startknop van de berekening (3b).",
    why: "Zakelijke context is de grootste hefboom van het model — de AI gebruikt elk vastgelegd feit in zijn voorstellen. Eerste berekening: instellingen op standaard en preset 'Snel'.",
  },
  run: {
    what: "Twee substappen: volg de lopende berekening (4a — fase, verstreken tijd, verwachte duur) en beoordeel daarna het resultaat en publiceer naar het klantdashboard (4b).",
    why: "Zodra een berekening klaar is of faalt, meldt de AI zich vanzelf in de chat. Vertrouw je de uitkomst? Dan is publiceren de afsluitende klik van het hele proces.",
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
