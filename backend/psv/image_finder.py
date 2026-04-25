"""
Image Finder — zoekt PSV-relevante afbeeldingen per nieuwsbriefsectie.

Twee functies:
  is_psv_relevant_image()  — filter: is een bestaande og:image PSV-specifiek?
  find_section_image()     — actieve zoeker via Gemini + Google Search grounding
"""
import logging
import re
from datetime import datetime

from backend.psv import config, llm, fetcher

logger = logging.getLogger(__name__)

# Officiële PSV-domeinen: og:image hiervan is altijd PSV-specifiek
_TIER1_DOMAINS = {"psv.nl", "psvfans.nl", "psvinside.nl", "psv.supporters.nl", "1908.nl"}

# Domeinen voor de Gemini-grounding fallback (PSV-zoekquery garandeert al relevantie)
_TRUSTED_FALLBACK = {
    "psv.nl", "ed.nl", "omroepbrabant.nl", "psvfans.nl", "1908.nl", "psvinside.nl",
    "vi.nl", "voetbalzone.nl", "fcupdate.nl", "voetbalprimeur.nl", "soccernews.nl",
    "nos.nl", "nu.nl", "ad.nl", "telegraaf.nl", "voetbalnieuws.nl",
}

_PSV_KEYWORDS = {"psv", "eindhoven"}

_SECTIE_TOPICS = {
    "terugblik":    "wedstrijd resultaat uitslag doelpunten",
    "vooruitblik":  "volgende wedstrijd voorbeschouwing preview",
    "ziekenboeg":   "blessures selectie herstel spelers",
    "transfers":    "transfer aanwinst vertrek contract",
    "achtergrond":  "nieuws analyse interview trainer Peter Bosz",
}


def is_psv_relevant_image(og_image: str, bron_url: str, titel: str) -> bool:
    """True als og:image waarschijnlijk PSV-specifiek is.

    Regels:
    - Van een officieel PSV-domein → altijd OK
    - Anders: "PSV" of "Eindhoven" moet in de artikeltitel staan
    """
    if not og_image or not og_image.startswith("http"):
        return False
    if any(d in bron_url for d in _TIER1_DOMAINS):
        return True
    titel_lower = titel.lower()
    return any(kw in titel_lower for kw in _PSV_KEYWORDS)


def find_section_image(sectie: str, scout_profile: dict) -> str | None:
    """Zoek een PSV-specifieke afbeelding via Gemini Google Search.

    Strategie:
    1. Bouw zoekquery op basis van sectie + scout_profile context
    2. Gemini zoekt via Google Search en geeft grounding chunk URIs terug
    3. Filter URIs op vertrouwde PSV-domeinen
    4. Haal og:image op van het eerste gevonden artikel
    5. Valideer de afbeeldings-URL
    """
    jaar = datetime.now().year
    topic = _SECTIE_TOPICS.get(sectie, "nieuws")

    # Bouw contextrijke zoekquery
    context_parts = [f"PSV Eindhoven {topic} {jaar}"]
    if sectie == "terugblik":
        opp = (scout_profile.get("laatste_wedstrijd") or {}).get("tegenstander")
        if opp:
            context_parts.append(opp)
    elif sectie == "vooruitblik":
        opp = (scout_profile.get("volgende_wedstrijd") or {}).get("tegenstander")
        if opp:
            context_parts.append(opp)
    elif sectie in ("ziekenboeg", "achtergrond"):
        spelers = scout_profile.get("sleutelspelers_nu", [])[:2]
        for s in spelers:
            naam = s.split(" ")[0]
            if naam:
                context_parts.append(naam)

    zoekterm = " ".join(context_parts)

    # Vraag Gemini om de URL expliciet in de tekst terug te geven
    # (grounding redirect-URLs verlopen snel en zijn niet direct opvraagbaar)
    prompt = (
        f"Gebruik Google Search om een recent artikel te vinden op psv.nl, vi.nl, "
        f"fcupdate.nl of ed.nl over: {zoekterm}. "
        f"Geef UITSLUITEND de volledige URL van het gevonden artikel terug, verder niets. "
        f"Voorbeeld: https://www.psv.nl/psv-nieuws/artikel/2026/..."
    )

    try:
        result = llm.generate_with_chunks(
            model=config.RESEARCHER_MODEL,
            prompt=prompt,
            temperature=0.1,
            tools=llm.GOOGLE_SEARCH_TOOL,
        )

        # Extraheer URL uit tekstresponse
        kandidaten = re.findall(r'https?://[^\s"\'<>\n]+', result.get("text", ""))
        kandidaten = [u.rstrip(".,)") for u in kandidaten]

        # Voeg ook grounding URIs toe als die geen vertexaisearch zijn
        for uri in result.get("grounding_uris", []):
            if "vertexaisearch" not in uri:
                kandidaten.append(uri)

        for url in kandidaten:
            if not any(d in url for d in _TRUSTED_FALLBACK):
                continue
            og_image = fetcher.fetch_og_image(url)
            if og_image and _is_valid_image_url(og_image):
                logger.info(f"image_finder [{sectie}]: {og_image[:80]}")
                return og_image

        logger.info(f"image_finder [{sectie}]: geen bruikbare afbeelding gevonden")
        return None

    except Exception as e:
        logger.warning(f"image_finder fout voor sectie={sectie}: {e}")
        return None


def _is_valid_image_url(url: str) -> bool:
    """Minimale validatie: ziet dit eruit als een bruikbare afbeeldings-URL?"""
    if not url or not url.startswith("http"):
        return False
    if url.startswith("data:") or url.lower().endswith(".svg"):
        return False
    url_lower = url.lower().split("?")[0]
    img_extensions = (".jpg", ".jpeg", ".png", ".webp", ".gif")
    if any(url_lower.endswith(ext) for ext in img_extensions):
        return True
    cdn_patterns = ["cdn.", "/images/", "/media/", "/static/", "/uploads/", "/assets/", "/foto/"]
    return any(p in url_lower for p in cdn_patterns)
