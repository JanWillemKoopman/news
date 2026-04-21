"""
Standalone update-script — wordt wekelijks uitgevoerd door GitHub Actions.
Kan ook handmatig worden aangeroepen: python scripts/update.py
"""
import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

from datetime import datetime, timedelta
from backend.researcher import research_news
from backend.summarizer import summarize_articles
from backend.storage import save_summary
from backend.config import NEWS_SOURCES, GEMINI_API_KEY


def main():
    if not GEMINI_API_KEY:
        print("FOUT: GEMINI_API_KEY is niet ingesteld.", file=sys.stderr)
        sys.exit(1)

    today = datetime.now()
    week_end   = today.strftime("%Y-%m-%d")
    week_start = (today - timedelta(days=7)).strftime("%Y-%m-%d")

    logging.info(f"Update gestart voor week {week_start} t/m {week_end}")

    articles = research_news()
    logging.info(f"{len(articles)} artikelen verzameld")

    title, summary = summarize_articles(articles, week_start, week_end)

    entry = save_summary(
        title=title,
        summary=summary,
        week_start=week_start,
        week_end=week_end,
        sources=NEWS_SOURCES,
    )

    logging.info(f"Opgeslagen: '{entry['title']}'")
    print(f"\n✓ Weekoverzicht gepubliceerd: '{title}'")


if __name__ == "__main__":
    main()
