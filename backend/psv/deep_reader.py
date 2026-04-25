"""
Deep Reader — verrijkt onderzoeksresultaten per sectie met artikeltekst.

Grounding-redirect URLs (vertexaisearch.cloud.google.com) worden overgeslagen
omdat ze snel verlopen; de uitgebreide Researcher-samenvatting dient als fallback.
Permanente URLs (ed.nl, vi.nl, etc.) worden wél opgehaald.

Daarnaast worden URLs uit data/user_urls.txt altijd opgehaald en
automatisch aan de juiste sectie toegewezen.
"""
import json
import logging
import os
import re
from datetime import datetime

from backend.psv import config, llm, fetcher, image_finder

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

_CLASSIFY_PROMPT = """\
Lees de volgende artikeltekst en bepaal voor een PSV-nieuwsbrief:
1. Tot welke sectie behoort dit artikel?
2. Wat zijn de kernfeiten, quotes en cijfers?

Beschikbare secties: {secties}

Tekst (eerste 4000 tekens):
{tekst}

Geef je antwoord UITSLUITEND als geldig JSON:
{{
  "sectie": "een van [{secties}]",
  "titel": "korte beschrijvende titel van het artikel",
  "samenvatting": "10-15 zinnen met alle concrete feiten, namen, datums, quotes, cijfers",
  "datum": "YYYY-MM-DD of null"
}}
"""

_MAX_TEKST_TEKENS = 7000
_MAX_ITEMS_PER_SECTIE = 3
_MIN_TEXT_LENGTH = 300

# URLs met dit patroon verlopen snel — gebruik researcher-samenvatting als fallback
_SKIP_URL_PATTERNS = ["vertexaisearch.cloud.google.com/grounding-api-redirect"]


def _is_ephemeral_url(url: str) -> bool:
    return any(pattern in url for pattern in _SKIP_URL_PATTERNS)


def run(research_per_sectie: dict, scout_profile: dict, run_dir: str) -> dict:
    """Fetch + deep-read top items per sectie. Retourneert zelfde structuur verrijkt met 'diepgang'."""

    # Voeg user-URLs toe vóór normale verwerking
    research_per_sectie = _fetch_user_urls(research_per_sectie, scout_profile)

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
                item["diepgang"] = _fallback_diepgang(item)
                enriched_sectie.append(item)
                continue

            # Grounding-redirect URLs verlopen snel — direct naar fallback
            if _is_ephemeral_url(url):
                logger.debug(f"  → Grounding-redirect overgeslagen (verloopt snel): {url[:60]}")
                item["diepgang"] = _fallback_diepgang(item)
                enriched_sectie.append(item)
                continue

            logger.info(f"  Ophalen: {url[:80]}")
            fetched = fetcher.fetch_article(url)
            tekst = fetched.get("text", "") or ""
            og_image = fetched.get("og_image")
            if og_image and not item.get("image_url"):
                if image_finder.is_psv_relevant_image(og_image, url, item.get("titel", "")):
                    item["image_url"] = og_image
                else:
                    logger.debug(f"  → og:image overgeslagen (niet PSV-specifiek): {url[:60]}")

            if len(tekst) < _MIN_TEXT_LENGTH:
                logger.warning(
                    f"  → Tekst te kort ({len(tekst)} tekens) — probeer Gemini-fallback"
                )
                tekst = _gemini_fetch(url, item.get("titel", ""))

            if len(tekst) < _MIN_TEXT_LENGTH:
                logger.warning(f"  → Ook Gemini-fallback onvoldoende — samenvatting als basis")
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


def _fetch_user_urls(research_per_sectie: dict, scout_profile: dict) -> dict:
    """Haal user-opgegeven URLs op en voeg toe aan de juiste sectie."""
    user_urls_file = config.USER_URLS_FILE
    if not user_urls_file.exists():
        return research_per_sectie

    urls = [
        line.strip()
        for line in user_urls_file.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]

    if not urls:
        return research_per_sectie

    logger.info(f"Deep Reader: {len(urls)} user-URL(s) ophalen...")
    result = {k: list(v) for k, v in research_per_sectie.items()}
    secties = scout_profile.get("secties", ["terugblik", "vooruitblik", "ziekenboeg", "transfers", "achtergrond"])
    secties_str = ", ".join(secties)

    for url in urls:
        logger.info(f"  User-URL: {url[:80]}")
        fetched = fetcher.fetch_article(url)
        tekst = fetched.get("text", "") or ""
        og_image = fetched.get("og_image")

        if len(tekst) < _MIN_TEXT_LENGTH:
            logger.warning(f"  → User-URL niet bereikbaar of te kort: {url}")
            continue

        try:
            raw = llm.generate(
                model=config.DEEP_READER_MODEL,
                prompt=_CLASSIFY_PROMPT.format(
                    secties=secties_str,
                    tekst=tekst[:4000],
                ),
                system=_SYSTEM,
                temperature=0.1,
            )
            classified = llm.parse_json(raw)
            sectie = classified.get("sectie", "achtergrond")
            if sectie not in secties:
                sectie = "achtergrond"

            item = {
                "titel": classified.get("titel", url),
                "samenvatting": classified.get("samenvatting", ""),
                "bron_url": url,
                "bron_naam": url.split("/")[2] if url.startswith("http") else url,
                "datum": classified.get("datum") or datetime.now().strftime("%Y-%m-%d"),
                "sectie": sectie,
                "user_url": True,
                **({"image_url": og_image} if og_image and image_finder.is_psv_relevant_image(
                    og_image, url, classified.get("titel", "")) else {}),
                "diepgang": {
                    "quotes": [],
                    "cijfers": [],
                    "kernfeiten": [classified.get("samenvatting", "")],
                    "context": classified.get("samenvatting", ""),
                    "deep_fallback": False,
                },
            }
            result.setdefault(sectie, []).insert(0, item)
            logger.info(f"  → Sectie '{sectie}': {item['titel'][:60]}")
        except Exception as e:
            logger.error(f"  → Fout bij verwerken user-URL {url}: {e}")

    return result


def _gemini_fetch(url: str, titel: str = "") -> str:
    """Gebruik Gemini's web search als fallback voor JS-rendered of geblokkeerde pagina's."""
    try:
        zoekterm = titel or url
        raw = llm.generate(
            model=config.RESEARCHER_MODEL,
            prompt=(
                f"Haal de volledige inhoud op van dit artikel en geef de complete tekst terug:\n"
                f"URL: {url}\n"
                f"Titel (hint): {zoekterm}\n\n"
                f"Geef uitsluitend de artikeltekst terug — inclusief quotes, cijfers en context. "
                f"Geen samenvatting, geen commentaar van jezelf."
            ),
            system="Je bent een tekst-extractor. Geef de volledige ruwe artikeltekst terug.",
            temperature=0.1,
            tools=llm.GOOGLE_SEARCH_TOOL,
        )
        tekst = raw.strip() if raw else ""
        if tekst:
            logger.info(f"  → Gemini-fallback: {len(tekst)} tekens opgehaald")
        return tekst
    except Exception as e:
        logger.warning(f"  → Gemini-fallback mislukt: {e}")
        return ""


def _recency(item: dict) -> float:
    try:
        return datetime.strptime(item.get("datum", "2000-01-01"), "%Y-%m-%d").timestamp()
    except ValueError:
        return 0.0


def _fallback_diepgang(item: dict) -> dict:
    samenvatting = item.get("samenvatting", "")
    quotes = _extract_quotes_from_samenvatting(samenvatting)
    return {
        "quotes": quotes,
        "cijfers": [],
        "kernfeiten": [samenvatting[:400]] if samenvatting else [],
        "context": samenvatting,
        "deep_fallback": True,
    }


def _extract_quotes_from_samenvatting(tekst: str) -> list:
    """Extraheer [QUOTE – Naam]: "tekst" patronen uit de researcher-samenvatting."""
    pattern = re.compile(r'\[QUOTE\s*[–-]\s*([^\]]+)\]:\s*["“]([^"”]+)["”]')
    results = []
    for match in pattern.finditer(tekst):
        spreker = match.group(1).strip()
        quote = match.group(2).strip()
        if spreker and quote:
            results.append({"spreker": spreker, "quote": quote, "context": ""})
    return results


def _save(run_dir: str, data: dict) -> None:
    with open(os.path.join(run_dir, "deep.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
