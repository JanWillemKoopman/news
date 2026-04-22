"""
Researcher — per onderwerp één gerichte LLM-call met Google Search.
Output: lijst van research-items (JSON).
"""
import json
import logging
import os
import time
from datetime import datetime

from backend.psv import config, llm

logger = logging.getLogger(__name__)

_ALLE_ONDERWERPEN = [
    "wedstrijdverslag",
    "transfers",
    "blessures",
    "tactiek-analyse",
    "spelersinterviews",
    "jeugdopleiding",
    "supporterskant",
    "europese-context",
    "cijfers-data",
    "clubbusiness",
]

_SYSTEM = """\
Je bent een PSV-journalist die nauwkeurig feitelijk onderzoek doet voor een nieuwsbrief.
Zoek ALLEEN verifieerbare feiten over PSV Eindhoven. Geen speculatie, geen geruchten tenzij \
expliciet als zodanig gelabeld. Als er niets relevants te vinden is: geef een lege array terug.\
"""

_PROMPT = """\
Vandaag is {datum}. Zoek recent nieuws (afgelopen {zoekvenster} dagen) over PSV Eindhoven \
specifiek over: **{onderwerp}**.

Richt je zoekopdrachten op Nederlandse bronnen:
- psv.nl (officieel clubnieuws)
- ed.nl (Eindhovens Dagblad, beste lokale dekking)
- vi.nl (Voetbal International)
- voetbalzone.nl
- nos.nl/sport
- ad.nl/voetbal
- fcupdate.nl

Huidige context:
- Fase: {fase}
- Toon-advies van redactie: {toon_advies}

Geef je antwoord UITSLUITEND als geldig JSON-array (mag leeg zijn []):
[
  {{
    "titel": "Titel van het nieuwsitem",
    "samenvatting": "2-3 zinnen met de kernfeiten, geen meningen",
    "bron_url": "https://volledige-url.nl/artikel",
    "bron_naam": "ed.nl",
    "datum": "YYYY-MM-DD",
    "categorie": "{onderwerp}",
    "onderwerp_id": "{onderwerp}"
  }}
]

Regels:
- Maximaal 3 items per onderwerp
- Alleen items van de afgelopen {zoekvenster} dagen
- Geen duplicaten (zelfde verhaal van meerdere bronnen: kies beste bron)
- Bij niets gevonden: geef [] terug, geen placeholder-items\
"""


def run(scout_profile: dict, run_dir: str) -> list:
    prioriteit = scout_profile.get("prioriteitsonderwerpen", _ALLE_ONDERWERPEN[:6])
    skip = set(scout_profile.get("skip_onderwerpen", []))
    onderwerpen = [o for o in prioriteit if o not in skip]
    zoekvenster = scout_profile.get("zoekvenster_dagen", 7)
    fase = scout_profile.get("fase", "onbekend")
    toon_advies = scout_profile.get("toon_advies", "neutraal en journalistiek")
    datum = datetime.now().strftime("%d %B %Y")

    alle_items = []
    for i, onderwerp in enumerate(onderwerpen):
        logger.info(f"Researcher [{i+1}/{len(onderwerpen)}]: {onderwerp}")

        prompt = _PROMPT.format(
            datum=datum,
            zoekvenster=zoekvenster,
            onderwerp=onderwerp,
            fase=fase,
            toon_advies=toon_advies,
        )

        try:
            raw = llm.generate(
                model=config.RESEARCHER_MODEL,
                prompt=prompt,
                system=_SYSTEM,
                temperature=0.1,
                tools=llm.GOOGLE_SEARCH_TOOL,
            )
            items = llm.parse_json(raw)
            if isinstance(items, list):
                alle_items.extend(items)
                logger.info(f"  → {len(items)} items gevonden")
            else:
                logger.warning(f"  → Onverwacht formaat voor '{onderwerp}': {type(items)}")
        except Exception as e:
            logger.error(f"  → Researcher fout voor '{onderwerp}': {e}")

        if i < len(onderwerpen) - 1:
            time.sleep(1.5)  # Voorkom rate-limiting

    _save(run_dir, alle_items)
    logger.info(f"Researcher voltooid: {len(alle_items)} items over {len(onderwerpen)} onderwerpen")
    return alle_items


def _save(run_dir: str, data: list) -> None:
    with open(os.path.join(run_dir, "research.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
