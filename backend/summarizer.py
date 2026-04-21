import logging
from backend.config import SUMMARIZER_MODEL, SUMMARIZER_PROMPT_FILE
from backend.gemini_client import generate

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = """Je bent een journalist voor NRC Handelsblad. Je schrijft wekelijkse nieuwsoverzichten in de stijl van NRC: formeel, analytisch en van hoog journalistiek niveau.

Stijlrichtlijnen:
- Formele, beschaafde schrijftaal zonder sensationalisme
- Lange, goed geconstrueerde zinnen met nuance
- Objectief en feitelijk; geen meningen of waardeoordelen
- Gebruik de actieve stem; vermijd passief constructies waar mogelijk
- Verbanden leggen tussen nieuws-gebeurtenissen geeft diepgang
- Schrijf uitsluitend in het Nederlands

Structuur van de samenvatting:
1. Koptitel: bondig en informatief (geen clickbait)
2. Openingsparagraaf: de essentie van de week in 3-4 zinnen
3. Thematische secties met tussenkopjes (## Koptitel) voor Binnenland, Buitenland, Economie etc.
4. Slotparagraaf: perspectief of korte vooruitblik

Schrijf 600 tot 900 woorden. Begin direct met de koptitel op de eerste regel."""

DEFAULT_USER_TEMPLATE = """Week: {week_start} tot en met {week_end}

Hieronder de verzamelde nieuwsartikelen van deze week:

{articles_text}

Schrijf nu de wekelijkse NRC-samenvatting."""


def _load_system_prompt() -> str:
    if SUMMARIZER_PROMPT_FILE.exists():
        return SUMMARIZER_PROMPT_FILE.read_text(encoding="utf-8").strip()
    return DEFAULT_SYSTEM_PROMPT


def summarize_articles(articles: list, week_start: str, week_end: str) -> tuple:
    articles_text = "\n\n".join(
        f"**{a.get('title', '')}**\n"
        f"Bron: {a.get('source', '')} — {a.get('date', '')} — {a.get('category', '')}\n"
        f"{a.get('summary', '')}"
        for a in articles
    )

    system_prompt = _load_system_prompt()
    user_prompt = DEFAULT_USER_TEMPLATE.format(
        week_start=week_start,
        week_end=week_end,
        articles_text=articles_text,
    )

    logger.info("Summarizer gestart")
    text = generate(
        model=SUMMARIZER_MODEL,
        prompt=user_prompt,
        system=system_prompt,
        temperature=0.6,
    )
    text = text.strip()

    lines = text.split("\n")
    title = lines[0].lstrip("#").strip()
    body = "\n".join(lines[1:]).strip()

    logger.info(f"Samenvatting geschreven: '{title}'")
    return title, body
