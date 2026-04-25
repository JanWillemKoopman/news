"""
Artikel-fetcher op basis van trafilatura.
Geeft een dict terug met 'text' en 'url', of een leeg dict bij falen.
"""
import logging
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

            return {"text": text.strip(), "url": url}

        except Exception as e:
            logger.warning(f"Fetch poging {attempt + 1}/3 mislukt voor {url}: {e}")
            if attempt < 2:
                time.sleep(2 ** attempt)

    logger.error(f"Kon artikel niet ophalen: {url}")
    return {}
