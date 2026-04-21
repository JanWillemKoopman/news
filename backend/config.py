import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
PROMPTS_DIR = BASE_DIR / "prompts"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
RESEARCHER_MODEL = os.getenv("RESEARCHER_MODEL", "gemini-2.0-flash")
SUMMARIZER_MODEL = os.getenv("SUMMARIZER_MODEL", "gemini-2.0-flash")

SCHEDULE_DAY = os.getenv("SCHEDULE_DAY", "sun")
SCHEDULE_HOUR = int(os.getenv("SCHEDULE_HOUR", "16"))
SCHEDULE_MINUTE = int(os.getenv("SCHEDULE_MINUTE", "0"))
TIMEZONE = os.getenv("TIMEZONE", "Europe/Amsterdam")

SUMMARIES_FILE = DATA_DIR / "summaries.json"
RESEARCHER_PROMPT_FILE = PROMPTS_DIR / "researcher_prompt.txt"
SUMMARIZER_PROMPT_FILE = PROMPTS_DIR / "summarizer_prompt.txt"

TRIGGER_SECRET = os.getenv("TRIGGER_SECRET", "")

PAGE_SIZE = int(os.getenv("PAGE_SIZE", "5"))
PORT = int(os.getenv("PORT", "5000"))

NEWS_SOURCES = [
    s.strip()
    for s in os.getenv(
        "NEWS_SOURCES",
        "nu.nl, nos.nl, volkskrant.nl, ad.nl, rtlnieuws.nl"
    ).split(",")
]
