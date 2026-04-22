"""
Context Scout — bepaalt de huidige PSV-seizoensfase en stuurt de rest van de pipeline.
1 LLM-call met Google Search.
"""
import json
import logging
import os
from datetime import datetime

from backend.psv import config, llm

logger = logging.getLogger(__name__)

_SYSTEM = """\
Je bent een ervaren PSV-journalist die de actualiteit rondom PSV Eindhoven bijhoudt.
Je taak is de huidige sportieve context in kaart te brengen, zodat de redactie de \
nieuwsbrief optimaal kan samenstellen. Gebruik web search voor actuele informatie.\
"""

_PROMPT = """\
Vandaag is {datum}. Zoek actuele informatie over PSV Eindhoven en bepaal de huidige context.

Onderzoek:
1. Huidige competitiefase (Eredivisie speelronde X, Champions League, Europa League, \
   Conference League, winterstop, interlandperiode, transferwindow open/dicht)
2. Resultaat van de meest recente PSV-wedstrijd (score, tegenstander, competitie)
3. Eerstvolgende PSV-wedstrijd (datum, tegenstander, competitie)
4. Welke onderwerpen zijn het meest urgent voor PSV-supporters deze week?
5. Welke onderwerpen kun je beter overslaan? (bijv. geen match-preview tijdens interlandperiode)
6. Welke toon past bij de situatie? (bijv. kritisch na een verlies, hoopvol voor een \
   Europese kraker)

Beschikbare onderwerpen:
wedstrijdverslag, transfers, blessures, tactiek-analyse, spelersinterviews, \
jeugdopleiding, supporterskant, europese-context, cijfers-data, clubbusiness

Geef je antwoord UITSLUITEND als geldig JSON in dit exacte formaat (geen extra tekst):
{{
  "fase": "string bijv. 'Eredivisie speelronde 30'",
  "editie_type": "een van: regulier | europees | winterstop | transfer | interlandpauze",
  "laatste_wedstrijd": {{
    "datum": "YYYY-MM-DD of null",
    "tegenstander": "string of null",
    "uitslag": "string bijv. 'PSV 3-1 Ajax' of null",
    "competitie": "string of null"
  }},
  "volgende_wedstrijd": {{
    "datum": "YYYY-MM-DD of null",
    "tegenstander": "string of null",
    "competitie": "string of null"
  }},
  "zoekvenster_dagen": 7,
  "prioriteitsonderwerpen": ["wedstrijdverslag", "transfers"],
  "skip_onderwerpen": [],
  "toon_advies": "string: beschrijf de gewenste toon in 1-2 zinnen",
  "min_woorden_per_item": 200
}}\
"""


def run(run_dir: str) -> dict:
    prompt = _PROMPT.format(datum=datetime.now().strftime("%d %B %Y"))
    logger.info("Scout: bepaalt PSV-context via web search...")

    raw = llm.generate(
        model=config.SCOUT_MODEL,
        prompt=prompt,
        system=_SYSTEM,
        temperature=0.2,
        tools=llm.GOOGLE_SEARCH_TOOL,
    )

    result = llm.parse_json(raw)
    _save(run_dir, result)
    logger.info(
        f"Scout: fase='{result.get('fase')}', "
        f"type='{result.get('editie_type')}', "
        f"prioriteiten={result.get('prioriteitsonderwerpen')}"
    )
    return result


def _save(run_dir: str, data: dict) -> None:
    with open(os.path.join(run_dir, "scout.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
