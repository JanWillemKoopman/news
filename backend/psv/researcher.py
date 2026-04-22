"""
Researcher — voert de concrete zoekopdrachten uit die de Scout heeft gepland.
Eén LLM-call per query met Google Search; resultaten worden per sectie gegroepeerd.
"""
import json
import logging
import os
import time
from datetime import datetime, timedelta

from backend.psv import config, llm

logger = logging.getLogger(__name__)

_SYSTEM = """\
Je bent een PSV-journalist die nauwkeurig feitelijk onderzoek doet voor een nieuwsbrief.
Zoek ALLEEN verifieerbare feiten over PSV Eindhoven. Geen speculatie, geen verzonnen \
details. Als er niets relevants is voor de query: geef een lege array terug.\
"""

_PROMPT = """\
Vandaag is {datum} (jaar: {jaar}). Voer de volgende Google-zoekopdracht uit en extraheer \
de meest relevante feitelijke resultaten.

STRIKTE RECENCY-REGEL: Retourneer ALLEEN artikelen gepubliceerd op of na {cutoff_datum}. \
Artikelen van vóór {cutoff_datum} of van vorige seizoenen (vóór juli {vorig_jaar}) \
MOETEN worden weggelaten, ongeacht hoe relevant ze lijken.

Sectie: **{sectie}**
Query: **{query}**

Focus op Nederlandse bronnen (psv.nl, ed.nl, vi.nl, voetbalzone.nl, nos.nl/sport, \
ad.nl/voetbal, fcupdate.nl, 1908.nl, elfvoetbal.nl).

Geef je antwoord UITSLUITEND als geldig JSON-array (mag leeg zijn):
[
  {{
    "titel": "Titel van het artikel",
    "samenvatting": "3-5 zinnen met ALLE concrete feiten: namen, datums, uitslagen, \
bedragen, quotes (kort). Geen meningen. Zo concreet mogelijk.",
    "bron_url": "https://volledige-url",
    "bron_naam": "bijv. 'ed.nl'",
    "datum": "YYYY-MM-DD (publicatiedatum)",
    "sectie": "{sectie}"
  }}
]

Regels:
- Maximaal 3 items per query
- Alleen items waar je de bron-url van hebt
- GEEN items ouder dan 14 dagen of van vóór {cutoff_datum}
- Bij duplicaten over bronnen: kies de uitgebreidste versie
- Lege array [] bij niets relevants voor het HUIDIGE seizoen {jaar}\
"""

_PAUSE_SECONDS = 1.5


def run(scout_profile: dict, run_dir: str) -> dict:
    queries = scout_profile.get("research_queries", [])
    now = datetime.now()
    datum = now.strftime("%d %B %Y")
    jaar = now.year
    vorig_jaar = jaar - 1
    cutoff_datum = (now - timedelta(days=14)).strftime("%d %B %Y")

    if not queries:
        logger.warning("Researcher: geen queries van Scout ontvangen")
        _save(run_dir, {})
        return {}

    # Groepeer items per sectie
    per_sectie: dict = {}
    totaal = 0

    for i, q in enumerate(queries):
        sectie = q.get("sectie", "overig")
        query = q.get("query", "").strip()
        if not query:
            continue

        logger.info(f"Researcher [{i+1}/{len(queries)}] sectie={sectie}: {query}")

        prompt = _PROMPT.format(
            datum=datum,
            jaar=jaar,
            vorig_jaar=vorig_jaar,
            cutoff_datum=cutoff_datum,
            sectie=sectie,
            query=query,
        )

        try:
            raw = llm.generate(
                model=config.RESEARCHER_MODEL,
                prompt=prompt,
                system=_SYSTEM,
                temperature=0.1,
                tools=llm.GOOGLE_SEARCH_TOOL,
            )
            if not raw.strip():
                logger.warning("  → Lege respons, skip")
                continue
            items = llm.parse_json(raw)
            if isinstance(items, list) and items:
                per_sectie.setdefault(sectie, []).extend(items)
                totaal += len(items)
                logger.info(f"  → {len(items)} items")
            else:
                logger.info("  → 0 items")
        except Exception as e:
            logger.error(f"  → Fout: {e}")

        if i < len(queries) - 1:
            time.sleep(_PAUSE_SECONDS)

    # Dedupliceer binnen sectie op URL
    for sectie, items in per_sectie.items():
        seen_urls = set()
        unique = []
        for item in items:
            url = item.get("bron_url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique.append(item)
        per_sectie[sectie] = unique

    _save(run_dir, per_sectie)
    totaal_uniek = sum(len(v) for v in per_sectie.values())
    logger.info(
        f"Researcher voltooid: {totaal_uniek} unieke items over "
        f"{len(per_sectie)} secties (ruwe items: {totaal})"
    )
    for s, items in per_sectie.items():
        logger.info(f"  · {s}: {len(items)} items")
    return per_sectie


def _save(run_dir: str, data: dict) -> None:
    with open(os.path.join(run_dir, "research.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
