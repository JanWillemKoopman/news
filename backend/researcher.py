import json
import re
import logging
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

from backend.config import RESEARCHER_MODEL, RESEARCHER_PROMPT_FILE, NEWS_SOURCES
from backend.gemini_client import generate

logger = logging.getLogger(__name__)

FEED_URLS = {
    "nu.nl":         ["https://www.nu.nl/rss/algemeen", "https://www.nu.nl/rss/politiek"],
    "nos.nl":        ["https://feeds.nos.nl/nosnieuwsalgemeen"],
    "volkskrant.nl": ["https://www.volkskrant.nl/nieuws-achtergrond/rss.xml"],
    "ad.nl":         ["https://www.ad.nl/rss.xml"],
    "rtlnieuws.nl":  ["https://www.rtlnieuws.nl/nieuws/rss.xml"],
    "telegraaf.nl":  ["https://www.telegraaf.nl/rss"],
    "trouw.nl":      ["https://www.trouw.nl/nieuws/rss.xml"],
    "nrc.nl":        ["https://www.nrc.nl/rss/"],
}

DEFAULT_PROMPT = """Je bent een nieuwsredacteur. Analyseer de volgende nieuwskoppen van de afgelopen 7 dagen en selecteer de 15 tot 20 meest significante berichten.

Criteria: nationaal of internationaal belang, brede maatschappelijke relevantie, of opvallende ontwikkelingen in politiek, economie of samenleving.

Geef een JSON-array terug. Elk object heeft precies deze velden:
- "title": de koptitel (string)
- "summary": samenvatting van 2-3 zinnen (string)
- "source": de nieuwsbron, bijv. "nu.nl" (string)
- "date": datum in YYYY-MM-DD formaat (string)
- "category": Binnenland, Buitenland, Economie, Politiek, of Sport (string)

Geef ALLEEN de JSON-array terug, zonder uitleg of andere tekst.

Nieuwskoppen:
{articles}"""


def _strip_tags(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text or "").strip()


def _parse_date(text: str) -> datetime | None:
    if not text:
        return None
    try:
        return parsedate_to_datetime(text).astimezone(timezone.utc)
    except Exception:
        pass
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _fetch_feed(url: str, source: str, cutoff: datetime) -> list:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)"}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read()
    except urllib.error.URLError as e:
        logger.warning(f"  Kan {url} niet bereiken: {e}")
        return []

    try:
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        logger.warning(f"  XML-fout bij {url}: {e}")
        return []

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    articles = []

    for item in root.findall(".//item"):
        pub = _parse_date((item.findtext("pubDate") or "").strip())
        if pub and pub < cutoff:
            continue
        title = _strip_tags(item.findtext("title") or "")
        if not title:
            continue
        articles.append({
            "title":  title,
            "source": source,
            "date":   pub.strftime("%Y-%m-%d") if pub else datetime.now().strftime("%Y-%m-%d"),
        })

    for entry in root.findall(".//atom:entry", ns):
        pub_el = entry.find("atom:published", ns) or entry.find("atom:updated", ns)
        pub = _parse_date((pub_el.text or "").strip() if pub_el is not None else "")
        if pub and pub < cutoff:
            continue
        title_el = entry.find("atom:title", ns)
        title = _strip_tags((title_el.text or "") if title_el is not None else "")
        if not title:
            continue
        articles.append({
            "title":  title,
            "source": source,
            "date":   pub.strftime("%Y-%m-%d") if pub else datetime.now().strftime("%Y-%m-%d"),
        })

    return articles


def _fetch_all(sources: list) -> list:
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    all_articles = []
    for source in sources:
        source = source.strip().lower()
        urls = FEED_URLS.get(source, [])
        if not urls:
            logger.warning(f"  Geen RSS-feed bekend voor '{source}'")
            continue
        for url in urls:
            items = _fetch_feed(url, source, cutoff)
            logger.info(f"  {source}: {len(items)} artikelen via {url}")
            all_articles.extend(items)
    return all_articles


def _load_prompt() -> str:
    if RESEARCHER_PROMPT_FILE.exists():
        return RESEARCHER_PROMPT_FILE.read_text(encoding="utf-8").strip()
    return DEFAULT_PROMPT


def research_news(custom_prompt: str = None, sources: list = None) -> list:
    sources_list = sources or NEWS_SOURCES
    logger.info(f"Researcher gestart — bronnen: {', '.join(sources_list)}")

    raw = _fetch_all(sources_list)
    logger.info(f"Totaal {len(raw)} artikelen opgehaald via RSS")

    if not raw:
        raise ValueError("Geen artikelen gevonden. Controleer de RSS-feeds.")

    articles_text = "\n".join(
        f"[{a['source']} – {a['date']}] {a['title']}"
        for a in raw[:60]
    )

    template = custom_prompt or _load_prompt()
    prompt = template.format(articles=articles_text, sources=", ".join(sources_list))

    text = generate(model=RESEARCHER_MODEL, prompt=prompt, temperature=0.1)
    logger.info(f"Gemini selectie ontvangen ({len(text)} tekens)")

    match = re.search(r"\[.*\]", text, re.DOTALL)
    articles = json.loads(match.group() if match else text)
    logger.info(f"{len(articles)} artikelen geselecteerd")
    return articles
