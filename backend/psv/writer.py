"""
Writer — schrijft de volledige PSV-nieuwsbrief volgens een strikt sectietemplate.
Elke sectie heeft een eigen structuur (terugblik=matchverslag, vooruitblik=preview, etc.).
"""
import json
import logging
import os
from datetime import datetime

from backend.psv import config, llm

logger = logging.getLogger(__name__)

_SYSTEM = """\
Je bent een PSV-journalist die schrijft als 'liefhebbende criticaster': een intelligente \
PSV-supporter met journalistieke distantie. Je schrijft helder, rijk en inhoudelijk \
journalistiek Nederlands. Je verwerkt altijd concrete feiten, cijfers en quotes wanneer \
die beschikbaar zijn. Geen cheerleader, geen afbreker.

VERBODEN CLICHÉS — gebruik deze zinnen en woorden NOOIT:
- "finishlijn", "marathonseizoen", "kampioensschaal ruiken/proeven", "puzzel leggen"
- "druk op de ketel", "aderlating", "deur op een kier", "deur wagenwijd open"
- "winnaarsmentaliteit", "onwrikbare standaard", "constante toewijding", "professionele standaard"
- "goed nieuws voor de fans", "op papier", "koploper met alles te verliezen"
- "het team toonde veerkracht", "supporters dromen", "de geur van succes"
- "laatste loodjes wegen het zwaarst", "verplicht nummer", "drie punten een must"
- "hol van de leeuw", "voet van het gaspedaal", "een tandje bijzetten"
- "volle bak", "het bloed kruipt waar het niet gaan kan", "mentale klik"
- "de ploeg staat er goed voor", "op de gevels", "de strijd aangaan"
- "vol gas", "nek uitsteken", "in een hogere versnelling"
Vervang altijd door specifieke, concrete, originele bewoordingen die dit moment uniek maken.\
"""

# Per sectie: stijl + wat de Writer MOET verwerken
_SECTIE_BRIEF = {
    "terugblik": """\
TERUGBLIK (wedstrijdverslag van de laatste PSV-wedstrijd)
- Open met exacte uitslag, tegenstander, competitie, datum
- Noem alle doelpuntenmakers MET DE MINUUT (bijv. 'Ricardo Pepi, 44e min.') — zonder
  minuut is het geen verslag maar een sms
- Beschrijf het wedstrijdverloop: wie dominant, tactische hoofdlijn, sleutelmomenten
- Noem de STAND IN DE COMPETITIE na deze wedstrijd: positie, punten, voorsprong op nr. 2
- Gebruik quotes van Bosz of spelers (alleen als die in het bronmateriaal staan)
- Eindig met wat dit resultaat betekent in de context van het seizoen
- Minimum {min_woorden} woorden
""",
    "vooruitblik": """\
VOORUITBLIK (preview van de eerstvolgende wedstrijd)
- Open met EXACT AANVANGSTIJDSTIP, datum, tegenstander, stadion (thuis/uit), competitie
  Als het tijdstip niet in de bronnen staat: schrijf "aanvang nog niet bevestigd"
- Portretteer de tegenstander: huidige stand, recente vorm (laatste 3-5 results),
  gevaarlijkste spelers, tactisch systeem
- Beschrijf de inzet voor PSV: punten, voorsprong, kwalificatiescenario's
- Bespreek PSV's selectiezorgen: welke blessures/twijfelgevallen zijn relevant?
- Identificeer 1-2 sleuteldoelen: welke individuele duels of tactische keuzes zijn beslissend?
- Sluit af met context: wat volgt na dit duel (volgende wedstrijd, tijdlijn)
- Minimum {min_woorden} woorden
""",
    "ziekenboeg": """\
ZIEKENBOEG & SCHORSINGEN (gestructureerd overzicht selectie)
- Groepeer in drie blokken met expliciete kopjes: **Terugkeer**, **Blessures**, **Schorsingen**
- Per speler: naam, aard van blessure/schorsing, verwachte terugkeerdatum, impact op selectie
- Benoem ook positieve berichten (trainingsterugkeer, herstel voor specifieke wedstrijd)
- Als een blok leeg is (bijv. geen schorsingen): schrijf dit expliciet
- Eindig met de tactische consequentie: welke aanpassing is logisch voor de volgende wedstrijd?
- Minimum {min_woorden} woorden
""",
    "transfers": """\
TRANSFERS & GERUCHTEN
- Behandel concrete berichten per speler — zowel VERTREKKEND als AANKOMEND
- Per vertrekkend bericht: speler, geschatte waarde of vraagprijs, interesse van welke clubs,
  plausibiliteit, relevante contractdetails
- Per inkomend bericht: welke positie moet versterkt worden en waarom, genoemde namen,
  tijdlijn en budget-indicatie
- Als er geen concrete inkomende namen zijn: bespreek welke posities PSV MOET versterken
  op basis van vertrekkers en formatie-behoeften, met concrete redenering
- Onderscheid harde feiten (aankondigingen, officiële uitspraken) van geruchten
- Sluit af met een strategische reflectie: hoe past dit alles in het transfermodel van PSV?
- Minimum {min_woorden} woorden
""",
    "achtergrond": """\
ACHTERGROND & ANALYSE
- Kies ÉÉN concreet thema en werk dat grondig uit. Kies het thema dat het beste aansluit
  bij het beschikbare bronmateriaal:
  A. Tactische diepgang: hoe werkt Bosz' systeem, met voorbeelden uit recente wedstrijden
  B. Financieel/transfermodel: PSV's doorverkoopstrategie, economische positie, ambities
  C. Spelersprofiel: diepgaande analyse van één sleutelspeler (rol, contract, perspectief)
  D. Clubbusiness of fanklimaat: hoe wordt het succes beleefd buiten het veld
- Essay-stijl: doordacht, nuancerend, met langere analytische lijnen
- GEEN herhalingen van feiten uit andere secties
- GEEN abstracte lofzangen — elk oordeel moet worden onderbouwd met een concreet voorbeeld
- Verwerk een quote of statistiek uit het bronmateriaal als aanknopingspunt
- Minimum {min_woorden} woorden
""",
}

_PROMPT = """\
Schrijf de PSV-nieuwsbrief voor deze week. Vandaag is {datum}.

REDACTIONELE CONTEXT (van de Scout):
- Fase: {fase}
- Stand: {stand}
- Laatste wedstrijd: {laatste_wedstrijd}
- Volgende wedstrijd: {volgende_wedstrijd}
- Sleutelspelers/onderwerpen: {sleutelspelers}
- Toon-advies: {toon_advies}

REDACTIEPLAN (van de Editor):
- Sectievolgorde: {sectievolgorde}
- Hoek per sectie: {sectie_hoeken}
- Kopverhaal-sectie (narratief anker voor inleiding): {kopverhaal_sectie}

BRONMATERIAAL PER SECTIE:
{materiaal_per_sectie}

SCHRIJFINSTRUCTIES:

1. INLEIDING (2-3 alinea's, ~200 woorden)
   - Pakkend openen. Benoem de belangrijkste gebeurtenis(sen) van de week.
   - Plaats deze editie in het grotere plaatje van het seizoen (stand, fase).
   - Verwijs naar het kopverhaal-sectie (wat is het hoofdverhaal?).
   - Géén opsomming van secties; maak er een lopend verhaal van.

2. PER SECTIE — volg onderstaande briefing EXACT voor elke sectie in de sectievolgorde:
{sectie_briefings}

3. VEREISTEN VOOR DE HELE TEKST:
   - Verwerk CONCRETE feiten uit het bronmateriaal: namen, uitslagen, datums, bedragen, quotes.
   - Alle quotes met spreker en (indien bekend) bron.
   - Cijfers altijd met eenheid en context.
   - Toon: liefhebbende criticaster — nuancering, risico's én kansen.
   - Geen clichés (zie systeemprompt), geen placeholder-teksten.

4. NRC-OPMAAK (gebruik dit in je secties):
   - Voor letterlijke quotes gebruik je ALTIJD blockquote-syntax als de quote beschikbaar is:
     > "Letterlijke uitspraak van de persoon."
     > — *Volledige naam*, functie of club
   - Gebruik ELKE beschikbare quote uit het bronmateriaal — niet spaarzaam, maar volledig.
     Een quote die in de bronnen staat en wordt weggelaten is een gemiste kans.
   - Voor contextuele achtergrondinformatie die de lopende tekst zou onderbreken
     maar wél relevant is, gebruik je een kader-blok:
     :::kader
     **DUIDING:** Hier staat de contextuele toelichting in 2-4 zinnen.
     :::
   - Gebruik kaders spaarzaam: maximaal 1 per sectie, alleen voor echte achtergrondduiding.
   - Gebruik GEEN blockquote als je de quote al in de lopende tekst parafraseert.

5. ANTI-HALLUCINATION REGELS (HARD — overtreding maakt de nieuwsbrief onbruikbaar):
   - Schrijf UITSLUITEND feiten, quotes en cijfers die letterlijk in het bovenstaande \
     bronmateriaal staan. Geen enkel detail mag uit algemene voetbalkennis komen.
   - Ontbreekt een detail (aanvangstijdstip, tegenstander-statistieken, spelersnames)?  \
     Schrijf dan expliciet "nog niet bevestigd" of laat het weg. NOOIT invullen.
   - Verzin NOOIT een uitslag, datum, spelersnaam, transferbedrag of quote die niet \
     expliciet in het bronmateriaal staat.
   - Als je voor een sectie weinig brondata hebt, schrijf dan een kortere eerlijke sectie \
     op basis van wat WEL beschikbaar is. Maak het NIET kunstmatig langer met abstracte frasen.
   - Verwijs NOOIT naar wedstrijden of bekers uit voorgaande seizoenen tenzij het \
     bronmateriaal dit expliciet als historische context aanhaalt.
   - Alle feiten moeten betrekking hebben op het huidige seizoen {seizoen}.

6. STRUCTUURVEREISTEN (HARD — controleer dit vóór je antwoord):
   - Je "secties" array moet EXACT {n_secties} objecten bevatten in deze volgorde: {sectievolgorde}.
   - Elke sectie-body minimaal {min_woorden} woorden en minimaal 3 alinea's.
   - Tel secties en woorden; geef alleen antwoord als aan beide eisen is voldaan.

Geef je antwoord UITSLUITEND als geldig JSON (strict!):
{{
  "titel": "Pakkende nieuwsbrieftitel (max 80 tekens)",
  "inleiding": "Markdown-tekst, 2-3 alinea's",
  "secties": [
    {{
      "sectie_id": "terugblik",
      "kop": "Sectiekop die de inhoud samenvat",
      "body": "Volledige markdown-tekst voor deze sectie, minimaal {min_woorden} woorden"
    }}
  ],
  "intro": "Vloeiende teaser-tekst van 5-10 regels die direct onder de titel verschijnt. \
Schrijf dit ALS ALLERLAATSTE nadat je alle secties hebt uitgewerkt. \
Toon: nieuwsgierig makend, journalistiek, geen opsomming. \
Trek de lezer naar binnen met het grootste verhaal van deze editie en laat subtiel \
doorschemeren wat er verder in de nieuwsbrief staat — zonder alles weg te geven. \
Geen clichés. Geen bullets. Gewone lopende tekst in 1-2 alinea's."
}}

Lever ALLE {n_secties} secties in dezelfde volgorde als sectievolgorde.{feedback_sectie}\
"""

_FEEDBACK_TMPL = """

FEEDBACK VAN REVIEWER (verwerk dit in je revisie):
{feedback}"""


def run(
    editor_result: dict,
    scout_profile: dict,
    run_dir: str,
    feedback: str = None,
) -> dict:
    now = datetime.now()
    jaar = now.year
    seizoen = f"{jaar - 1}/{str(jaar)[-2:]}"

    sectievolgorde = editor_result.get("sectievolgorde", [])
    items_per_sectie = editor_result.get("items_per_sectie", {})
    min_woorden = scout_profile.get("min_woorden_per_sectie", 350)

    # Bouw per-sectie bronmateriaal (compact)
    materiaal = _format_materiaal(items_per_sectie, sectievolgorde)

    # Bouw per-sectie briefings
    sectie_briefings = "\n".join(
        _SECTIE_BRIEF.get(s, "").format(min_woorden=min_woorden)
        for s in sectievolgorde
    )

    feedback_sectie = _FEEDBACK_TMPL.format(feedback=feedback) if feedback else ""

    prompt = _PROMPT.format(
        datum=now.strftime("%d %B %Y"),
        seizoen=seizoen,
        fase=scout_profile.get("fase", "onbekend"),
        stand=scout_profile.get("stand", "onbekend"),
        laatste_wedstrijd=json.dumps(scout_profile.get("laatste_wedstrijd", {}), ensure_ascii=False),
        volgende_wedstrijd=json.dumps(scout_profile.get("volgende_wedstrijd", {}), ensure_ascii=False),
        sleutelspelers=", ".join(scout_profile.get("sleutelspelers_nu", [])),
        toon_advies=scout_profile.get("toon_advies", ""),
        sectievolgorde=", ".join(sectievolgorde),
        n_secties=len(sectievolgorde),
        sectie_hoeken=json.dumps(editor_result.get("sectie_hoeken", {}), ensure_ascii=False, indent=2),
        kopverhaal_sectie=editor_result.get("kopverhaal_sectie", "onbekend"),
        materiaal_per_sectie=materiaal,
        sectie_briefings=sectie_briefings,
        min_woorden=min_woorden,
        feedback_sectie=feedback_sectie,
    )

    logger.info(f"Writer: schrijft nieuwsbrief ({len(sectievolgorde)} secties)...")
    raw = llm.generate(
        model=config.WRITER_MODEL,
        prompt=prompt,
        system=_SYSTEM,
        temperature=0.6,
    )

    result = llm.parse_json(raw)
    _save(run_dir, result)
    logger.info(f"Writer: titel='{result.get('titel', '?')}' secties={len(result.get('secties', []))}")
    return result


def _format_materiaal(items_per_sectie: dict, volgorde: list) -> str:
    blokken = []
    for sectie in volgorde:
        items = items_per_sectie.get(sectie, [])
        if not items:
            blokken.append(f"## {sectie}\n(geen items)")
            continue

        regels = [f"## {sectie}"]
        for i, item in enumerate(items, 1):
            d = item.get("diepgang", {}) or {}
            regels.append(f"[{i}] Titel: {item.get('titel', '')}")
            regels.append(f"    Bron: {item.get('bron_naam', '')} — {item.get('bron_url', '')}")
            regels.append(f"    Datum: {item.get('datum', '')}")
            regels.append(f"    Samenvatting: {item.get('samenvatting', '')}")
            if d.get("kernfeiten"):
                regels.append(f"    Kernfeiten: {'; '.join(d['kernfeiten'])}")
            if d.get("quotes"):
                for q in d["quotes"]:
                    regels.append(
                        f"    Quote — {q.get('spreker', '?')}: "
                        f"\"{q.get('quote', '')}\""
                    )
            if d.get("cijfers"):
                for c in d["cijfers"]:
                    regels.append(
                        f"    Cijfer — {c.get('type', '?')}: {c.get('waarde', '?')}"
                    )
            if d.get("context"):
                regels.append(f"    Context: {d['context']}")
            regels.append("")
        blokken.append("\n".join(regels))
    return "\n\n".join(blokken)


def _save(run_dir: str, data: dict) -> None:
    with open(os.path.join(run_dir, "writer.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
