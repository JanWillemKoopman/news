"""
Deep Reader — fetcht de volledige artikeltekst en destilleert quotes, cijfers en context.
Fallback op Researcher-samenvatting bij mislukte fetch.
"""
import json
import logging
import os
from datetime import datetime

from backend.psv import config, llm, fetcher

logger = logging.getLogger(__name__)

_SYSTEM = """\
Je bent een nauwkeurige tekstanalist voor een PSV-nieuwsbrief. Je taak is het destilleren \
van concrete, verifieerbare feiten uit ruwe artikeltekst. Verzin NOOIT quotes of cijfers — \
alleen letterlijk overgenomen tekst is toegestaan.\
"""

_PROMPT = """\
Analyseer de onderstaande artikeltekst en extraheer:

1. Directe QUOTES — alleen als ze letterlijk in de tekst staan, met exacte spreker
2. Concrete CIJFERS en statistieken (transferbedragen, speelminuten, standen, doelpunten, etc.)
3. CONTEXT die niet in de kop/lead stond maar wél relevant is voor PSV-supporters

Artikel-URL: {url}

Artikeltekst:
---
{tekst}
---

Geef je antwoord UITSLUITEND als geldig JSON:
{{
  "quotes": [
    {{
      "spreker": "Volledige naam",
      "quote": "Letterlijke tekst uit het artikel",
      "context": "Korte situatiebeschrijving"
    }}
  ],
  "cijfers": [
    {{
      "type": "bijv. transferbedrag",
      "waarde": "bijv. '€18 miljoen'",
      "context": "Korte context"
    }}
  ],
  "context": "Extra achtergrond die niet in de kop stond (max 3 zinnen)"
}}

Lege arrays zijn beter dan verzonnen feiten.\
"""

_MAX_TEKST_TEKENS = 6000
_MAX_ITEMS = 7


def run(research_items: list, scout_profile: dict, run_dir: str) -> list:
    selected = _select_items(research_items, max_n=_MAX_ITEMS)
    logger.info(f"Deep Reader: {len(selected)} items geselecteerd voor verdieping")

    enriched = []
    for item in selected:
        url = item.get("bron_url", "")
        logger.info(f"  Ophalen: {url[:70]}...")

        fetch_result = fetcher.fetch_article(url)

        if not fetch_result.get("text"):
            logger.warning(f"  → Fetch mislukt, gebruik Researcher-samenvatting als fallback")
            item["diepgang"] = {
                "quotes": [],
                "cijfers": [],
                "context": item.get("samenvatting", ""),
                "deep_fallback": True,
            }
            enriched.append(item)
            continue

        try:
            tekst = fetch_result["text"][:_MAX_TEKST_TEKENS]
            prompt = _PROMPT.format(url=url, tekst=tekst)
            raw = llm.generate(
                model=config.DEEP_READER_MODEL,
                prompt=prompt,
                system=_SYSTEM,
                temperature=0.1,
            )
            diepgang = llm.parse_json(raw)
            diepgang["deep_fallback"] = False
            item["diepgang"] = diepgang
            logger.info(
                f"  → {len(diepgang.get('quotes', []))} quotes, "
                f"{len(diepgang.get('cijfers', []))} cijfers"
            )
        except Exception as e:
            logger.error(f"  → Deep Reader analyse mislukt: {e}")
            item["diepgang"] = {
                "quotes": [],
                "cijfers": [],
                "context": item.get("samenvatting", ""),
                "deep_fallback": True,
            }

        enriched.append(item)

    _save(run_dir, enriched)
    logger.info(f"Deep Reader voltooid: {len(enriched)} items verrijkt")
    return enriched


def _select_items(items: list, max_n: int) -> list:
    """Selecteer diverse recente items: één per categorie, dan aanvullen op recency."""
    def recency(item):
        try:
            return datetime.strptime(item.get("datum", "2000-01-01"), "%Y-%m-%d").timestamp()
        except ValueError:
            return 0.0

    sorted_items = sorted(items, key=recency, reverse=True)

    selected = []
    seen_cats = set()

    for item in sorted_items:
        cat = item.get("categorie", "")
        if cat not in seen_cats:
            selected.append(item)
            seen_cats.add(cat)
        if len(selected) >= max_n:
            break

    for item in sorted_items:
        if item not in selected:
            selected.append(item)
        if len(selected) >= max_n:
            break

    return selected[:max_n]


def _save(run_dir: str, data: list) -> None:
    with open(os.path.join(run_dir, "deep.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
