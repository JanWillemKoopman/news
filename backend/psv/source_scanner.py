"""
Source Scanner — bezoekt overzichtspagina's van nieuwsbronnen en extraheert
relevante PSV-artikellinks. Draait na de Researcher, vóór de Deep Reader.

Bronnen worden gesorteerd op categorie (1 = hoogste kwaliteit eerst).
Categorie 4 (aggregators/fansites) wordt overgeslagen.
"""
import json
import logging
import os
import time
from datetime import datetime, timedelta

from backend.psv import config, fetcher, llm

logger = logging.getLogger(__name__)

_SYSTEM = """\
Je bent een PSV-nieuwsredacteur. Je analyseert overzichtspagina's van sportnieuwssites
en extraheert uitsluitend links naar recente, relevante PSV Eindhoven artikelen.
Verzin NOOIT URLs — extraheer alleen links die letterlijk op de pagina staan.\
"""

_PROMPT = """\
Vandaag is {datum}. Analyseer onderstaande paginatekst van '{bron_naam}' en extraheer
tot {max_items} PSV Eindhoven artikelen gepubliceerd op of na {cutoff_datum}.

Paginatekst:
---
{tekst}
---

Geef je antwoord UITSLUITEND als geldig JSON-array (mag leeg zijn []):
[
  {{
    "titel": "Exacte artikeltitel zoals op de pagina",
    "url": "https://volledige-url-naar-artikel",
    "sectie": "een van: terugblik, vooruitblik, ziekenboeg, transfers, achtergrond",
    "datum": "YYYY-MM-DD of null als onbekend",
    "samenvatting": "2-3 zinnen met de kern van het artikel op basis van de kop/lead"
  }}
]

Regels:
- Alleen artikelen die ECHT over PSV Eindhoven gaan
- Alleen artikelen gepubliceerd op of na {cutoff_datum}
- Geen doublures met andere items
- Lege array [] als er niets relevants is\
"""

_PAUSE_SECONDS = 1.5
_MAX_TEKST_TEKENS = 5000
_MAX_ITEMS_PER_BRON = 3


def run(scout_profile: dict, run_dir: str) -> dict:
    """Scan nieuwsbronnen en retourneer gevonden items per sectie."""
    sources_file = config.NEWS_SOURCES_FILE
    if not sources_file.exists():
        logger.warning("Source Scanner: news_sources.json niet gevonden, stap overgeslagen")
        return {}

    bronnen = json.loads(sources_file.read_text(encoding="utf-8"))
    te_scannen = sorted(
        [b for b in bronnen if b.get("scan", False)],
        key=lambda b: b.get("categorie", 99),
    )

    if not te_scannen:
        logger.info("Source Scanner: geen bronnen om te scannen")
        return {}

    now = datetime.now()
    datum = now.strftime("%d %B %Y")
    cutoff_datum = (now - timedelta(days=14)).strftime("%d %B %Y")

    per_sectie: dict = {}
    totaal = 0

    logger.info(f"Source Scanner: {len(te_scannen)} bronnen scannen (cat 1-3)...")

    for i, bron in enumerate(te_scannen):
        naam = bron["naam"]
        url = bron["url"]

        logger.info(f"  [{i+1}/{len(te_scannen)}] {naam}")

        fetched = fetcher.fetch_article(url)
        tekst = fetched.get("text", "") or ""

        if len(tekst) < 200:
            logger.warning(f"    → Pagina niet bereikbaar of leeg: {url}")
            if i < len(te_scannen) - 1:
                time.sleep(_PAUSE_SECONDS)
            continue

        try:
            raw = llm.generate(
                model=config.RESEARCHER_MODEL,
                prompt=_PROMPT.format(
                    datum=datum,
                    bron_naam=naam,
                    max_items=_MAX_ITEMS_PER_BRON,
                    cutoff_datum=cutoff_datum,
                    tekst=tekst[:_MAX_TEKST_TEKENS],
                ),
                system=_SYSTEM,
                temperature=0.1,
            )

            items = llm.parse_json(raw)
            if not isinstance(items, list):
                logger.warning(f"    → Onverwacht antwoordformaat van {naam}")
                continue

            geldig = [
                _normalise(item, naam)
                for item in items
                if item.get("url") and item.get("titel")
            ]

            for item in geldig:
                sectie = item["sectie"]
                per_sectie.setdefault(sectie, []).append(item)

            totaal += len(geldig)
            logger.info(f"    → {len(geldig)} items gevonden")

        except Exception as e:
            logger.error(f"    → Fout bij {naam}: {e}")

        if i < len(te_scannen) - 1:
            time.sleep(_PAUSE_SECONDS)

    _save(run_dir, per_sectie)
    logger.info(
        f"Source Scanner voltooid: {totaal} items over "
        f"{len(per_sectie)} secties uit {len(te_scannen)} bronnen"
    )
    for s, items in per_sectie.items():
        logger.info(f"  · {s}: {len(items)} items")

    return per_sectie


def _normalise(item: dict, bron_naam: str) -> dict:
    """Zorg voor consistente itemstructuur."""
    return {
        "titel":     item.get("titel", ""),
        "samenvatting": item.get("samenvatting", ""),
        "bron_url":  item.get("url", ""),
        "bron_naam": bron_naam,
        "datum":     item.get("datum") or datetime.now().strftime("%Y-%m-%d"),
        "sectie":    item.get("sectie", "achtergrond"),
        "from_scanner": True,
    }


def _save(run_dir: str, data: dict) -> None:
    with open(os.path.join(run_dir, "sources.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
