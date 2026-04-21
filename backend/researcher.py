import json
import re
import logging
from google import genai
from google.genai.types import Tool, GenerateContentConfig, GoogleSearch
from backend.config import GEMINI_API_KEY, RESEARCHER_MODEL, RESEARCHER_PROMPT_FILE, NEWS_SOURCES

logger = logging.getLogger(__name__)

DEFAULT_PROMPT = """Zoek alle belangrijke nieuwsartikelen van de afgelopen 7 dagen op van de volgende Nederlandse nieuwsbronnen: {sources}

Geef een gestructureerd overzicht terug als JSON-array. Elk object in de array heeft precies deze velden:
- "title": de titel van het artikel (string)
- "summary": een korte samenvatting van 2-3 zinnen (string)
- "source": de naam van de nieuwsbron, bijv. "nu.nl" (string)
- "date": de publicatiedatum in YYYY-MM-DD formaat (string)
- "category": de nieuwscategorie, bijv. Binnenland, Buitenland, Economie, Politiek, Sport (string)

Selecteer de 15 tot 25 meest significante en breed gedeelde nieuwsberichten, verdeeld over verschillende categorieën. Geef ALLEEN de JSON-array terug, zonder inleidende tekst of uitleg."""


def _load_prompt() -> str:
    if RESEARCHER_PROMPT_FILE.exists():
        return RESEARCHER_PROMPT_FILE.read_text(encoding="utf-8").strip()
    return DEFAULT_PROMPT


def research_news(custom_prompt: str = None, sources: list = None) -> list:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is niet ingesteld in .env")

    client = genai.Client(api_key=GEMINI_API_KEY)
    sources_list = sources or NEWS_SOURCES
    sources_str = ", ".join(sources_list)

    template = custom_prompt or _load_prompt()
    prompt = template.format(sources=sources_str)

    logger.info(f"Researcher gestart met bronnen: {sources_str}")

    response = client.models.generate_content(
        model=RESEARCHER_MODEL,
        contents=prompt,
        config=GenerateContentConfig(
            tools=[Tool(google_search=GoogleSearch())],
            temperature=0.1,
        ),
    )

    text = response.text.strip()
    logger.info(f"Researcher response ontvangen ({len(text)} tekens)")

    json_match = re.search(r"\[.*\]", text, re.DOTALL)
    if json_match:
        articles = json.loads(json_match.group())
    else:
        articles = json.loads(text)

    logger.info(f"{len(articles)} artikelen verzameld")
    return articles
