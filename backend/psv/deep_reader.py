"""
Deep Reader — fetcht de volledige artikeltekst per sectie en destilleert
quotes, cijfers en context. Fallback op Researcher-samenvatting bij mislukte fetch.
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
Analyseer de onderstaande artikeltekst en extraheer voor een PSV-nieuwsbrief:

1. Directe QUOTES — alleen letterlijk overgenomen, met exacte spreker
2. CIJFERS en statistieken (transferbedragen, speelminuten, standen, doelpunten, data)
3. CONTEXT die niet in de kop/lead stond maar relevant is voor PSV-supporters
4. KERNFEITEN — lijst met concrete gebeurtenissen / feiten uit dit artikel

Artikel-URL: {url}
Artikeltekst:
---
{tekst}
---

Geef je antwoord UITSLUITEND als geldig JSON:
{{
  "quotes": [
    {{"spreker": "Volledige naam", "quote": "Letterlijke tekst", "context": "Korte situatie"}}
  ],
  "cijfers": [
    {{"type": "bijv. transferbedrag", "waarde": "bijv. '€18 miljoen'", "context": "Korte context"}}
  ],
  "kernfeiten": ["Feit 1 in 1 zin", "Feit 2 in 1 zin"],
  "context": "Extra achtergrond die niet in kop/lead stond (max 3 zinnen)"
}}

Lege arrays zijn beter dan verzonnen feiten.\
"""

_MAX_TEKST_TEKENS = 7000
_MAX_ITEMS_PER_SECTIE = 3
_MIN_TEXT_LENGTH = 300  # tekens; korter = paywall/cookiemuur/redirect → skippen


def run(research_per_sectie: dict, scout_profile: dict, run_dir: str) -> dict:
    """Fetch + deep-read top items per sectie. Retourneert zelfde structuur verrijkt met 'diepgang'."""
    enriched: dict = {}
    totaal = 0

    for sectie, items in research_per_sectie.items():
        sorted_items = sorted(items, key=_recency, reverse=True)
        logger.info(f"Deep Reader sectie='{sectie}': {len(sorted_items)} items beschikbaar")

        enriched_sectie = []
        deep_read_count = 0

        for item in sorted_items:
            url = item.get("bron_url", "")
            if not url:
                item["diepgang"] = _fallback_diepgang(item)
                enriched_sectie.append(item)
                continue

            if deep_read_count >= _MAX_ITEMS_PER_SECTIE:
                # Alle deep-read slots zijn gevuld — rest meenemen als fallback-bron
                item["diepgang"] = _fallback_diepgang(item)
                enriched_sectie.append(item)
                continue

            logger.info(f"  Ophalen: {url[:80]}")
            fetched = fetcher.fetch_article(url)
            tekst = fetched.get("text", "") or ""

            if len(tekst) < _MIN_TEXT_LENGTH:
                logger.warning(
                    f"  → Tekst te kort ({len(tekst)} tekens, min {_MIN_TEXT_LENGTH}) "
                    f"— paywall/cookiemuur? Volgende item wordt geprobeerd."
                )
                item["diepgang"] = _fallback_diepgang(item)
                enriched_sectie.append(item)
                continue

            try:
                raw = llm.generate(
                    model=config.DEEP_READER_MODEL,
                    prompt=_PROMPT.format(url=url, tekst=tekst[:_MAX_TEKST_TEKENS]),
                    system=_SYSTEM,
                    temperature=0.1,
                )
                diepgang = llm.parse_json(raw)
                diepgang["deep_fallback"] = False
                item["diepgang"] = diepgang
                deep_read_count += 1
                logger.info(
                    f"  → quotes={len(diepgang.get('quotes', []))} "
                    f"cijfers={len(diepgang.get('cijfers', []))} "
                    f"feiten={len(diepgang.get('kernfeiten', []))}"
                )
            except Exception as e:
                logger.error(f"  → Deep Reader fout: {e}")
                item["diepgang"] = _fallback_diepgang(item)

            enriched_sectie.append(item)

        enriched[sectie] = enriched_sectie
        totaal += len(enriched_sectie)

    _save(run_dir, enriched)
    logger.info(f"Deep Reader voltooid: {totaal} items verrijkt over {len(enriched)} secties")
    return enriched


def _recency(item: dict) -> float:
    try:
        return datetime.strptime(item.get("datum", "2000-01-01"), "%Y-%m-%d").timestamp()
    except ValueError:
        return 0.0


def _fallback_diepgang(item: dict) -> dict:
    return {
        "quotes": [],
        "cijfers": [],
        "kernfeiten": [item.get("samenvatting", "")[:200]] if item.get("samenvatting") else [],
        "context": item.get("samenvatting", ""),
        "deep_fallback": True,
    }


def _save(run_dir: str, data: dict) -> None:
    with open(os.path.join(run_dir, "deep.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
