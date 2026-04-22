"""
Context Scout — bepaalt seizoensfase, wedstrijdkalender en produceert concrete
research-queries per verplichte nieuwsbrief-sectie.
1 LLM-call met Google Search.
"""
import json
import logging
import os
from datetime import datetime

from backend.psv import config, llm

logger = logging.getLogger(__name__)

_SYSTEM = """\
Je bent een ervaren PSV-journalist en redactieplanner. Je taak is drieledig:
1. Breng de huidige sportieve context rondom PSV Eindhoven in kaart (fase, stand, \
   recent resultaat, aanstaande wedstrijd).
2. Bepaal welke vaste secties van de PSV-nieuwsbrief deze editie ingevuld moeten \
   worden (terugblik, vooruitblik, ziekenboeg, transfers, achtergrond).
3. Formuleer concrete, gerichte Google-zoekopdrachten die de Researcher-agent nodig \
   heeft om elke sectie inhoudelijk te kunnen vullen.

Gebruik web search om actuele, verifieerbare informatie te verzamelen. Wees precies \
met datums, uitslagen en spelersnamen.\
"""

_PROMPT = """\
Vandaag is {datum} (jaar: {jaar}). Onderzoek de actuele situatie rondom PSV Eindhoven \
en produceer een volledige redactieplanning voor de eerstvolgende PSV-nieuwsbrief.

BELANGRIJK: Alle informatie moet betrekking hebben op het HUIDIGE seizoen {seizoen}. \
Negeer volledig alle resultaten, artikelen en analyses van vóór 1 juli {vorig_jaar}. \
Gebruik altijd het jaar {jaar} in je zoekopdrachten.

=== STAP 1: Feitelijke context ===
Zoek op en rapporteer:
- Huidige competitiefase (bijv. 'Eredivisie speelronde 31', 'winterstop', 'interlandpauze')
- Stand in de competitie (positie en punten uit aantal wedstrijden)
- Meest recente PSV-wedstrijd: datum, tegenstander, uit/thuis, exacte uitslag, competitie
- Eerstvolgende PSV-wedstrijd: datum, tegenstander, uit/thuis, competitie
- Bereken 'dagen_geleden' (hoeveel dagen tussen laatste wedstrijd en vandaag: {datum})
- Bereken 'dagen_tot' (hoeveel dagen tussen vandaag: {datum} en volgende wedstrijd)
- Benoem 3-6 actuele sleutelspelers of sleutelonderwerpen (specifieke namen/zaken die \
  deze week spelen — blessures, terugkeer, schorsing, uitblinkers, transfergeruchten)

=== STAP 2: Verplichte secties ===
Bepaal welke secties in deze editie moeten zitten volgens deze regels:
- "terugblik"    → ALTIJD als dagen_geleden <= 10 en laatste wedstrijd bekend
- "vooruitblik"  → ALTIJD als dagen_tot <= 5 en volgende wedstrijd bekend
- "ziekenboeg"   → ALTIJD (blessures én schorsingen)
- "transfers"    → ALTIJD (transfers, geruchten, contracten)
- "achtergrond"  → ALTIJD (analyse, interviews, jeugd, clubbusiness)

Stel ook in of "requires_match_preview" true is: dit is het geval als de volgende \
wedstrijd binnen 48 uur plaatsvindt (dagen_tot <= 2). Dit veld zorgt ervoor dat de \
vooruitblik VERPLICHT en als eerste sectie verschijnt.

=== STAP 3: Research-queries ===
Schrijf voor ELKE verplichte sectie 2-4 concrete Google-zoekopdrachten. Eisen:
- Benoem specifieke namen, datums EN HET JAAR {jaar} (géén vage termen als 'recent nieuws')
- Meng algemene queries met site-specifieke queries (bijv. 'site:ed.nl PSV Veerman')
- Voor terugblik: gebruik tegenstander-naam, wedstrijddatum én jaar {jaar}
- Voor vooruitblik: gebruik volgende tegenstander-naam, datum van de wedstrijd én jaar {jaar}
- Voor ziekenboeg: noem spelersnamen expliciet (Schouten, Veerman, Til, etc.)
- Voor transfers: noem concrete namen als die in geruchten zitten
- ALLE queries moeten filteren op nieuws van maximaal 14 dagen oud

Geef je ANTWOORD UITSLUITEND als geldig JSON in dit exacte formaat:
{{
  "fase": "string",
  "stand": "string bijv. '1e plaats, 74 punten uit 30 wedstrijden'",
  "laatste_wedstrijd": {{
    "datum": "YYYY-MM-DD of null",
    "tegenstander": "string of null",
    "thuis_uit": "thuis | uit | null",
    "uitslag": "string bijv. 'Sparta 0-2 PSV' of null",
    "competitie": "string of null",
    "dagen_geleden": 0
  }},
  "volgende_wedstrijd": {{
    "datum": "YYYY-MM-DD of null",
    "tegenstander": "string of null",
    "thuis_uit": "thuis | uit | null",
    "competitie": "string of null",
    "dagen_tot": 0
  }},
  "sleutelspelers_nu": ["naam1", "naam2", "onderwerp3"],
  "verplichte_secties": ["terugblik", "vooruitblik", "ziekenboeg", "transfers", "achtergrond"],
  "requires_match_preview": false,
  "research_queries": [
    {{"sectie": "terugblik",   "query": "PSV Sparta Rotterdam april {jaar} samenvatting uitslag"}},
    {{"sectie": "terugblik",   "query": "site:ed.nl PSV Sparta {jaar} analyse"}},
    {{"sectie": "vooruitblik", "query": "PSV PEC Zwolle {jaar} voorbeschouwing opstelling"}},
    {{"sectie": "vooruitblik", "query": "Peter Bosz persconferentie PSV {jaar}"}},
    {{"sectie": "ziekenboeg",  "query": "PSV blessures selectie {jaar} Veerman Schouten"}},
    {{"sectie": "ziekenboeg",  "query": "PSV schorsing {jaar}"}},
    {{"sectie": "transfers",   "query": "PSV transfer geruchten zomer {jaar}"}},
    {{"sectie": "achtergrond", "query": "Peter Bosz interview PSV {jaar}"}}
  ],
  "toon_advies": "string (2 zinnen): gewenste toon voor deze editie",
  "min_woorden_per_sectie": 250
}}

Belangrijk:
- Geen placeholder-teksten ('bijv.') in je echte antwoord — alleen echte waarden
- Zoek actief met web search; verzin geen uitslagen of datums
- Laat velden leeg (null) als je ze niet kunt verifiëren
- Zet requires_match_preview op true als de volgende wedstrijd binnen 48 uur is\
"""


def run(run_dir: str) -> dict:
    now = datetime.now()
    jaar = now.year
    vorig_jaar = jaar - 1
    seizoen = f"{vorig_jaar}/{str(jaar)[-2:]}"
    prompt = _PROMPT.format(
        datum=now.strftime("%d %B %Y"),
        jaar=jaar,
        vorig_jaar=vorig_jaar,
        seizoen=seizoen,
    )
    logger.info("Scout: bepaalt PSV-context en plant research-queries...")

    raw = llm.generate(
        model=config.SCOUT_MODEL,
        prompt=prompt,
        system=_SYSTEM,
        temperature=0.2,
        tools=llm.GOOGLE_SEARCH_TOOL,
    )

    result = llm.parse_json(raw)
    _save(run_dir, result)

    n_queries = len(result.get("research_queries", []))
    secties = result.get("verplichte_secties", [])
    requires_preview = result.get("requires_match_preview", False)
    logger.info(
        f"Scout: fase='{result.get('fase')}', "
        f"secties={secties}, queries={n_queries}, "
        f"requires_match_preview={requires_preview}"
    )
    laatste = result.get("laatste_wedstrijd", {})
    if laatste.get("tegenstander"):
        logger.info(
            f"  Laatste: {laatste.get('uitslag')} ({laatste.get('datum')}, "
            f"{laatste.get('dagen_geleden')}d geleden)"
        )
    volgende = result.get("volgende_wedstrijd", {})
    if volgende.get("tegenstander"):
        logger.info(
            f"  Volgende: vs {volgende.get('tegenstander')} ({volgende.get('datum')}, "
            f"over {volgende.get('dagen_tot')}d)"
        )
    return result


def _save(run_dir: str, data: dict) -> None:
    with open(os.path.join(run_dir, "scout.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
