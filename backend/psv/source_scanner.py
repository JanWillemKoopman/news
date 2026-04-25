"""
Source Scanner — bezoekt overzichtspagina's en RSS-feeds van nieuwsbronnen en extraheert
relevante PSV-artikellinks. Draait na de Researcher, vóór de Deep Reader.

Bronnen met een "rss" veld worden via RSS gelezen (sneller, betrouwbaarder).
Bronnen zonder "rss" veld worden via HTML-scraping benaderd.
Categorie 4 (aggregators/fansites) wordt overgeslagen.
"""
import json
import logging
import os
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime

from backend.psv import config, fetcher, llm

logger = logging.getLogger(__name__)

_SYSTEM = """\
Je bent een PSV-nieuwsredacteur. Je analyseert overzichtspagina's van sportnieuwssites
en extraheert uitsluitend links naar recente, relevante PSV Eindhoven artikelen.
Verzin NOOIT URLs — extraheer alleen links die letterlijk op de pagina staan.\
"""

_HTML_PROMPT = """\
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

_RSS_CLASSIFY_PROMPT = """\
Lees de volgende RSS-artikelgegevens en bepaal voor een PSV-nieuwsbrief:
1. Tot welke sectie behoort dit artikel?
2. Schrijf een samenvatting van 3-5 zinnen op basis van titel en beschrijving.

Beschikbare secties: {secties}

Titel: {titel}
Beschrijving: {beschrijving}
Datum: {datum}

Geef je antwoord UITSLUITEND als geldig JSON:
{{
  "sectie": "een van [{secties}]",
  "samenvatting": "3-5 zinnen met de kern van het artikel"
}}
"""

_PAUSE_SECONDS = 1.5
_MAX_TEKST_TEKENS = 5000
_MAX_ITEMS_PER_BRON = 3

# XML-namespaces voor Atom feeds
_ATOM_NS = "http://www.w3.org/2005/Atom"
_MEDIA_NS = "http://search.yahoo.com/mrss/"


def run(scout_profile: dict, run_dir: str) -> dict:
    """Scan nieuwsbronnen via RSS of HTML en retourneer gevonden items per sectie."""
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

    secties = scout_profile.get("secties", ["terugblik", "vooruitblik", "ziekenboeg", "transfers", "achtergrond"])
    now = datetime.now()
    datum = now.strftime("%d %B %Y")
    cutoff_date = now - timedelta(days=7)
    cutoff_datum = cutoff_date.strftime("%d %B %Y")

    per_sectie: dict = {}
    totaal = 0

    rss_count = sum(1 for b in te_scannen if b.get("rss"))
    html_count = len(te_scannen) - rss_count
    logger.info(f"Source Scanner: {len(te_scannen)} bronnen ({rss_count} RSS, {html_count} HTML)...")

    for i, bron in enumerate(te_scannen):
        naam = bron["naam"]

        if bron.get("rss"):
            logger.info(f"  [{i+1}/{len(te_scannen)}] {naam} (RSS)")
            items = _read_rss(bron, secties, cutoff_date)
        else:
            logger.info(f"  [{i+1}/{len(te_scannen)}] {naam} (HTML)")
            items = _scrape_html(bron, datum, cutoff_datum)

        for item in items:
            per_sectie.setdefault(item["sectie"], []).append(item)

        totaal += len(items)
        logger.info(f"    → {len(items)} items gevonden")

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


def _read_rss(bron: dict, secties: list, cutoff_date: datetime) -> list:
    """Lees RSS 2.0 of Atom feed en retourneer PSV-relevante items."""
    naam = bron["naam"]
    rss_url = bron["rss"]
    psv_filter = bron.get("psv_filter", True)
    secties_str = ", ".join(secties)

    raw = fetcher.fetch_raw(rss_url)
    if not raw:
        return []

    try:
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        logger.warning(f"    → RSS parse-fout bij {naam}: {e}")
        return []

    entries = _extract_feed_entries(root)
    if not entries:
        logger.warning(f"    → Geen entries in feed van {naam}")
        return []

    items = []
    for entry in entries:
        titel = entry.get("titel", "").strip()
        url = entry.get("url", "").strip()
        if not titel or not url:
            continue

        # Optionele PSV-filter voor algemene sportfeeds
        if psv_filter:
            tekst_check = (titel + " " + entry.get("beschrijving", "")).upper()
            if "PSV" not in tekst_check:
                continue

        # Datum check
        datum_str = entry.get("datum", datetime.now().strftime("%Y-%m-%d"))
        try:
            if datetime.strptime(datum_str, "%Y-%m-%d") < cutoff_date:
                continue
        except ValueError:
            pass

        beschrijving = entry.get("beschrijving", "")[:500]

        # Sectie + samenvatting via LLM
        try:
            raw_llm = llm.generate(
                model=config.RESEARCHER_MODEL,
                prompt=_RSS_CLASSIFY_PROMPT.format(
                    secties=secties_str,
                    titel=titel,
                    beschrijving=beschrijving or "(geen beschrijving beschikbaar)",
                    datum=datum_str,
                ),
                system=_SYSTEM,
                temperature=0.1,
            )
            classified = llm.parse_json(raw_llm)
            sectie = classified.get("sectie", "achtergrond")
            if sectie not in secties:
                sectie = "achtergrond"
            samenvatting = classified.get("samenvatting", beschrijving)
        except Exception as e:
            logger.warning(f"    → RSS classify fout voor '{titel[:40]}': {e}")
            sectie = "achtergrond"
            samenvatting = beschrijving

        items.append(_normalise({"titel": titel, "url": url, "sectie": sectie, "datum": datum_str, "samenvatting": samenvatting}, naam))

        if len(items) >= _MAX_ITEMS_PER_BRON:
            break

    return items


def _extract_feed_entries(root: ET.Element) -> list:
    """Parseer RSS 2.0 en Atom entries naar uniforme dicts."""
    tag = root.tag.lower()

    # Atom feed: <feed xmlns="http://www.w3.org/2005/Atom">
    if "atom" in tag or root.tag == f"{{{_ATOM_NS}}}feed":
        ns = {"a": _ATOM_NS}
        entries = root.findall("a:entry", ns) or root.findall(f"{{{_ATOM_NS}}}entry")
        result = []
        for e in entries:
            titel = _text(e, ["a:title", "title"], ns)
            # Atom: <link href="..." rel="alternate"/>
            url = ""
            for link in (e.findall("a:link", ns) or e.findall("link")):
                rel = link.get("rel", "alternate")
                if rel in ("alternate", "") or not rel:
                    url = link.get("href", "")
                    break
            beschrijving = _strip_html(_text(e, ["a:summary", "a:content", "summary", "content"], ns))
            datum = _parse_date(_text(e, ["a:published", "a:updated", "published", "updated"], ns))
            result.append({"titel": titel, "url": url, "beschrijving": beschrijving, "datum": datum})
        return result

    # RSS 2.0: <rss><channel><item>
    channel = root.find("channel")
    if channel is None:
        # Sommige feeds hebben root=channel
        channel = root
    items = channel.findall("item")
    result = []
    for item in items:
        titel = _text(item, ["title"])
        url = _text(item, ["link"]) or _text(item, ["guid"])
        beschrijving = _strip_html(_text(item, ["description"]))
        datum = _parse_date(_text(item, ["pubDate", "dc:date"]))
        result.append({"titel": titel, "url": url, "beschrijving": beschrijving, "datum": datum})
    return result


def _text(element: ET.Element, tags: list, ns: dict = None) -> str:
    """Zoek eerste gevonden tag en geef de tekst terug."""
    for tag in tags:
        try:
            found = element.find(tag, ns) if ns else element.find(tag)
            if found is not None and found.text:
                return found.text.strip()
        except Exception:
            pass
    return ""


def _strip_html(tekst: str) -> str:
    return re.sub(r"<[^>]+>", "", tekst).strip()


def _parse_date(date_str: str) -> str:
    """Converteer RSS/Atom datumstring naar YYYY-MM-DD."""
    if not date_str:
        return datetime.now().strftime("%Y-%m-%d")
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str[:19], fmt[:len(date_str)]).strftime("%Y-%m-%d")
        except ValueError:
            pass
    try:
        return parsedate_to_datetime(date_str).strftime("%Y-%m-%d")
    except Exception:
        return datetime.now().strftime("%Y-%m-%d")


def _scrape_html(bron: dict, datum: str, cutoff_datum: str) -> list:
    """Scrape HTML-overzichtspagina en extraheer PSV-artikelen via LLM."""
    naam = bron["naam"]
    url = bron["url"]

    fetched = fetcher.fetch_article(url)
    tekst = fetched.get("text", "") or ""

    if len(tekst) < 200:
        logger.warning(f"    → Pagina niet bereikbaar of leeg: {url}")
        return []

    try:
        raw = llm.generate(
            model=config.RESEARCHER_MODEL,
            prompt=_HTML_PROMPT.format(
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
            return []
        return [
            _normalise(item, naam)
            for item in items
            if item.get("url") and item.get("titel")
        ]
    except Exception as e:
        logger.error(f"    → Fout bij {naam}: {e}")
        return []


def _normalise(item: dict, bron_naam: str) -> dict:
    return {
        "titel":        item.get("titel", ""),
        "samenvatting": item.get("samenvatting", ""),
        "bron_url":     item.get("url", ""),
        "bron_naam":    bron_naam,
        "datum":        item.get("datum") or datetime.now().strftime("%Y-%m-%d"),
        "sectie":       item.get("sectie", "achtergrond"),
        "from_scanner": True,
    }


def _save(run_dir: str, data: dict) -> None:
    with open(os.path.join(run_dir, "sources.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
