import os
import secrets
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"

# Vinted
VINTED_DB = DATA_DIR / "vinted.db"
VINTED_UPLOAD_DIR = BASE_DIR / "uploads"
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

SCHEDULE_DAY = os.getenv("SCHEDULE_DAY", "sun")
SCHEDULE_HOUR = int(os.getenv("SCHEDULE_HOUR", "16"))
SCHEDULE_MINUTE = int(os.getenv("SCHEDULE_MINUTE", "0"))
TIMEZONE = os.getenv("TIMEZONE", "Europe/Amsterdam")

SUMMARIES_FILE = DATA_DIR / "summaries.json"

TRIGGER_SECRET = os.getenv("TRIGGER_SECRET", "")

PAGE_SIZE = int(os.getenv("PAGE_SIZE", "5"))
PORT = int(os.getenv("PORT", "5000"))

SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))
DB_PATH = DATA_DIR / "users.db"

NEWS_SOURCES = [
    s.strip()
    for s in os.getenv(
        "NEWS_SOURCES",
        "nu.nl, nos.nl, volkskrant.nl, ad.nl, rtlnieuws.nl"
    ).split(",")
]
