import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent.parent.parent
DATA_DIR = BASE_DIR / "data"
RUNS_DIR = BASE_DIR / "runs"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

SCOUT_MODEL       = os.getenv("SCOUT_MODEL",       "gemini-2.5-pro")
RESEARCHER_MODEL  = os.getenv("RESEARCHER_MODEL",  "gemini-2.5-flash")
DEEP_READER_MODEL = os.getenv("DEEP_READER_MODEL", "gemini-2.5-pro")
EDITOR_MODEL      = os.getenv("EDITOR_MODEL",      "gemini-2.5-pro")
WRITER_MODEL      = os.getenv("WRITER_MODEL",      "gemini-2.5-pro")
REVIEWER_MODEL    = os.getenv("REVIEWER_MODEL",    "gemini-2.5-pro")

SUMMARIES_FILE     = DATA_DIR / "summaries.json"
SEEN_ITEMS_FILE    = DATA_DIR / "seen_items.json"
USER_URLS_FILE     = DATA_DIR / "user_urls.txt"
NEWS_SOURCES_FILE  = DATA_DIR / "news_sources.json"

PAGE_SIZE = int(os.getenv("PAGE_SIZE", "5"))
