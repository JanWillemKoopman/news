export const COACH_SYSTEM_PROMPT = `Je bent een ervaren Nederlandse sollicitatiecoach en loopbaanadviseur met jarenlange ervaring in werving en selectie. Je helpt de gebruiker een overtuigende, professionele sollicitatiebrief te schrijven die de lezer aanzet om de kandidaat uit te nodigen voor een gesprek.

Kernprincipes:
- Je communiceert en schrijft ALTIJD in het Nederlands.
- Je toon is professioneel en zelfverzekerd, maar niet arrogant.
- Je koppelt de ervaring uit het CV concreet aan de eisen uit de vacature.
- Je vermijdt clichés en holle frasen; je maakt elke claim specifiek en geloofwaardig.`

export function buildAnalyzePrompt(vacancy: string, cvText: string | null): string {
  const cvBlok = cvText
    ? `CV VAN DE KANDIDAAT:\n${cvText}`
    : `Het CV van de kandidaat is bijgevoegd als PDF-bestand. Lees dit zorgvuldig.`

  return `${cvBlok}

VACATURETEKST:
${vacancy}

Analyseer het CV en de vacature grondig. Lever je antwoord als JSON met deze velden:
- "analysis": 2 tot 3 zinnen in het Nederlands over hoe goed de kandidaat past, met de sterkste aansluiting en het belangrijkste aandachtspunt.
- "question": één gerichte vraag aan de kandidaat waarvan het antwoord de sollicitatiebrief het sterkst maakt. Beknopt, in het Nederlands.
- "cvText": de volledige, schoon opgemaakte platte tekst van het CV ${
    cvText
      ? '(neem de bovenstaande CV-tekst ongewijzigd over)'
      : '(transcribeer het bijgevoegde PDF-bestand naar leesbare platte tekst)'
  }.`
}

export function buildFollowupPrompt(
  cvText: string,
  vacancy: string,
  transcript: string,
  questionNumber: number
): string {
  return `CV VAN DE KANDIDAAT:
${cvText}

VACATURETEKST:
${vacancy}

GESPREK TOT NU TOE:
${transcript}

Stel nu vraag ${questionNumber} aan de kandidaat: één gerichte vervolgvraag waarvan het antwoord de sollicitatiebrief nog sterker maakt. De vraag moet:
- Voortbouwen op wat al besproken is en geen eerdere vraag herhalen
- Concrete, bruikbare informatie ophalen (prestaties, motivatie, voorbeelden)
- Beknopt zijn (maximaal 2-3 zinnen) en in het Nederlands

Geef uitsluitend de vraag, zonder inleiding of afsluiting.`
}

export function buildLetterPrompt(cvText: string, vacancy: string, transcript: string): string {
  return `CV VAN DE KANDIDAAT:
${cvText}

VACATURETEKST:
${vacancy}

ANTWOORDEN VAN DE KANDIDAAT OP DE VERDIEPENDE VRAGEN:
${transcript}

Schrijf nu de definitieve sollicitatiebrief in het Nederlands. Eisen:
- Professionele, zelfverzekerde toon die de lezer overtuigt om de kandidaat uit te nodigen voor een gesprek.
- Structuur: aanhef ("Geachte heer/mevrouw," als er geen naam bekend is), een pakkende openingsalinea, 2 tot 3 alinea's die concrete ervaring en prestaties uit het CV koppelen aan de eisen uit de vacature, en een krachtige afsluiting met een uitnodiging tot contact.
- Sluit af met "Met vriendelijke groet," gevolgd door de naam van de kandidaat als die uit het CV blijkt, anders "[Jouw naam]".
- Verwerk de antwoorden van de kandidaat concreet in de brief.
- Vermijd clichés en holle frasen; maak elke claim specifiek en geloofwaardig.
- Lengte: ongeveer 300 tot 400 woorden.

Geef uitsluitend de brieftekst terug, zonder koptekst, uitleg of opmaaktekens.`
}
