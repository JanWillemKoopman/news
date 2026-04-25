"""
Artikel-fetcher op basis van trafilatura.
Geeft een dict terug met 'text', 'url' en 'og_image', of een leeg dict bij falen.
"""
import logging
import re
import time

import requests
import trafilatura
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

_USER_AGENT = "Mozilla/5.0 (compatible; PSVNieuwsBot/1.0)"
_SESSION = requests.Session()
_SESSION.verify = False
_SESSION.headers["User-Agent"] = _USER_AGENT


def fetch_raw(url: str) -> bytes:
    """Haal ruwe bytes op zonder text-extractie (voor RSS/XML feeds)."""
    try:
        response = _SESSION.get(url, timeout=15)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logger.warning(f"fetch_raw mislukt voor {url}: {e}")
        return b""


def fetch_article(url: str) -> dict:
    for attempt in range(3):
        try:
            response = _SESSION.get(url, timeout=15)
            response.raise_for_status()
            html = response.text
            if not html:
                raise ValueError("Leeg HTTP-antwoord")

            text = trafilatura.extract(
                html,
                include_comments=False,
                include_tables=False,
                no_fallback=False,
                favor_precision=True,
            )

            if not text or len(text.strip()) < 100:
                raise ValueError(f"Te weinig tekst ({len(text or '')} tekens)")

            return {"text": text.strip(), "url": url, "og_image": _extract_og_image(html)}

        except Exception as e:
            logger.warning(f"Fetch poging {attempt + 1}/3 mislukt voor {url}: {e}")
            if attempt < 2:
                time.sleep(2 ** attempt)

    logger.error(f"Kon artikel niet ophalen: {url}")
    return {}


def fetch_og_image(url: str) -> str | None:
    """Haal alleen de og:image meta tag op van een URL (zonder volledige tekstextractie)."""
    try:
        html_bytes = fetch_raw(url)
        if not html_bytes:
            return None
        html = html_bytes.decode("utf-8", errors="replace")
        return _extract_og_image(html)
    except Exception as e:
        logger.warning(f"fetch_og_image mislukt voor {url}: {e}")
        return None


def _extract_og_image(html: str) -> str | None:
    for pattern in [
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
    ]:
        m = re.search(pattern, html, re.IGNORECASE)
        if m:
            return m.group(1)
    return None
