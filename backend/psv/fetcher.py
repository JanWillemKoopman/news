"""
Artikel-fetcher op basis van trafilatura.
Geeft een dict terug met 'text' en 'url', of een leeg dict bij falen.
"""
import logging
import time

import trafilatura

logger = logging.getLogger(__name__)

_USER_AGENT = "Mozilla/5.0 (compatible; PSVNieuwsBot/1.0)"


def fetch_article(url: str) -> dict:
    for attempt in range(3):
        try:
            downloaded = trafilatura.fetch_url(
                url,
                config=trafilatura.settings.use_config(),
            )
            if not downloaded:
                raise ValueError("Leeg HTTP-antwoord")

            text = trafilatura.extract(
                downloaded,
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
