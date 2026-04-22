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
die beschikbaar zijn. Geen cheerleader, geen afbreker.\
"""

# Per sectie: stijl + wat de Writer MOET verwerken
_SECTIE_BRIEF = {
    "terugblik": """\
TERUGBLIK (wedstrijdverslag van de laatste PSV-wedstrijd)
- Open met de uitslag, tegenstander, competitie en datum
- Beschrijf het wedstrijdbeeld: wie was dominant, wat was de tactische hoofdlijn
- Noem doelpuntenmakers, sleutelmomenten en belangrijke individuele prestaties
- Plaats de uitslag in context: wat betekent dit voor de titelstrijd / stand?
- Gebruik quotes van Bosz of spelers uit de diepgang-items
- Minimum {min_woorden} woorden
""",
    "vooruitblik": """\
VOORUITBLIK (preview van de eerstvolgende wedstrijd)
- Open met wanneer, tegen wie, waar (uit/thuis), welke competitie
- Beschrijf de inzet: wat staat er op het spel voor PSV?
- Analyseer de tegenstander kort (vorm, sterktes, zwaktes)
- Noem verwachte opstelling of twijfelgevallen wanneer bekend
- Identificeer 1-2 sleuteldoelen op de wedstrijd (welke duels bepalen de uitkomst?)
- Sluit af met een vooruitzicht op volgende wedstrijden (context)
- Minimum {min_woorden} woorden
""",
    "ziekenboeg": """\
ZIEKENBOEG & SCHORSINGEN (gestructureerd overzicht selectie)
- Groepeer in drie blokken: 'Terugkeer', 'Blessures', 'Schorsingen'
- Per speler: naam, blessure/schorsing, verwachte terugkeer, impact op selectie
- Benoem ook positieve berichten (trainingsterugkeer, herstel voor specifieke wedstrijd)
- Eindig met de tactische impact: wie moet Bosz vervangen, welke systeem-aanpassing ligt voor de hand?
- Minimum {min_woorden} woorden
""",
    "transfers": """\
TRANSFERS & GERUCHTEN
- Behandel concrete transferberichten per speler/onderwerp
- Noem per bericht: speler(s), bedrag indien bekend, bron, plausibiliteit
- Onderscheid harde feiten (aankondigingen, officiële quotes) van geruchten
- Sluit af met een korte reflectie op de transferstrategie (aanval/middenveld/verdediging)
- Minimum {min_woorden} woorden
""",
    "achtergrond": """\
ACHTERGROND & ANALYSE
- Diepere duiding: tactische trend, medische discussie, clubbusiness, mediabeeld, fanklimaat
- Essay-stijl: doordacht, met nuance en langere lijnen
- Verwerk liefst een quote of uitspraak uit de diepgang-items
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
   - Geen clichés, geen placeholder-teksten.

4. ANTI-HALLUCINATION REGELS (HARD — overtreding maakt de nieuwsbrief onbruikbaar):
   - Verzin NOOIT een uitslag, datum, spelersnaam, transferbedrag of quote die niet \
     expliciet in het bronmateriaal staat.
   - Als je voor een sectie weinig brondata hebt, schrijf dan een kortere eerlijke sectie \
     op basis van wat WEL beschikbaar is. Maak het NIET kunstmatig langer met abstracte frasen \
     ("het team toonde veerkracht", "de geur van de kampioensschaal", "supporters dromen").
   - Verwijs NOOIT naar wedstrijden of bekers uit voorgaande seizoenen tenzij het \
     bronmateriaal dit expliciet als historische context aanhaalt.
   - Alle feiten moeten betrekking hebben op het huidige seizoen {seizoen}.

5. STRUCTUURVEREISTEN (HARD — controleer dit vóór je antwoord):
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
  ]
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
    min_woorden = scout_profile.get("min_woorden_per_sectie", 250)

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
