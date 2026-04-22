"""
Writer — schrijft de volledige PSV-nieuwsbrief in 'liefhebbende criticaster'-stijl.
1 LLM-call, geen web search. Ontvangt optioneel feedback van de Reviewer.
"""
import json
import logging
import os

from backend.psv import config, llm

logger = logging.getLogger(__name__)

_SYSTEM = """\
Je bent een PSV-journalist die schrijft als een "liefhebbende criticaster": een intelligente \
PSV-supporter die ook journalist is. Je bent trots op de club maar schuwt kritiek niet. \
Geen cheerleader, geen afbreker. Je schrijft helder, journalistiek Nederlands. \
Structuur per artikel: aanleiding → context → consequentie.\
"""

_PROMPT = """\
Schrijf de PSV-nieuwsbrief voor deze week op basis van de onderstaande items.

REDACTIONELE CONTEXT:
- Huidige fase: {fase}
- Toon-advies: {toon_advies}
- Minimum woorden per sub-artikel: {min_woorden}

GESELECTEERDE ITEMS MET BRONDIEPGANG:
{items_json}

SCHRIJFINSTRUCTIES:
1. INLEIDING (2-3 alinea's): Vat de week voor PSV samen. Pakkend, journalistiek. \
   Verwijs naar de meest opvallende ontwikkelingen. Geen opsomming maar een verhaal.

2. SUB-ARTIKELEN: Schrijf voor elk item:
   - Kop: prikkelend maar accuraat (geen clickbait, max 10 woorden)
   - Lead: 1-2 zinnen die de kern vatten
   - Body: minimaal {min_woorden} woorden. Verwerk CONCRETE quotes en cijfers uit \
     de diepgang-sectie. Structuur: aanleiding → context → consequentie.

3. TOON: Liefhebbende criticaster. Nuanceer. Wijs op risico's én kansen. \
   Geen overdreven lof of zwart-wit kritiek.

4. FEITEN: Alle quotes met spreker en bron. Alle bedragen/statistieken met eenheid. \
   Gebruik ALLEEN feiten uit de items hieronder.

Geef je antwoord UITSLUITEND als geldig JSON:
{{
  "titel": "Nieuwsbrieftitel (max 80 tekens, prikkelend)",
  "inleiding": "Inleidingstekst in markdown (2-3 alinea's)",
  "items": [
    {{
      "kop": "string",
      "lead": "string",
      "body": "string in markdown, minimaal {min_woorden} woorden"
    }}
  ]
}}{feedback_sectie}\
"""

_FEEDBACK_TMPL = """

FEEDBACK VAN REVIEWER (verwerk dit in je revisie):
{feedback}"""


def run(
    editor_result: dict,
    scout_profile: dict,
    run_dir: str,
    feedback: str = None,
) -> dict:
    items = editor_result.get("items_volledig", [])
    min_woorden = scout_profile.get("min_woorden_per_item", 200)

    # Bouw compact items-blok voor de prompt
    items_compact = []
    for item in items:
        d = item.get("diepgang", {})
        items_compact.append({
            "titel":            item.get("titel"),
            "samenvatting":     item.get("samenvatting"),
            "bron_url":         item.get("bron_url"),
            "bron_naam":        item.get("bron_naam"),
            "datum":            item.get("datum"),
            "categorie":        item.get("categorie"),
            "diepgang_quotes":  d.get("quotes", []),
            "diepgang_cijfers": d.get("cijfers", []),
            "diepgang_context": d.get("context", ""),
            "deep_fallback":    d.get("deep_fallback", True),
        })

    feedback_sectie = _FEEDBACK_TMPL.format(feedback=feedback) if feedback else ""

    prompt = _PROMPT.format(
        fase=scout_profile.get("fase", ""),
        toon_advies=scout_profile.get("toon_advies", ""),
        min_woorden=min_woorden,
        items_json=json.dumps(items_compact, ensure_ascii=False, indent=2),
        feedback_sectie=feedback_sectie,
    )

    logger.info(f"Writer: schrijft nieuwsbrief ({len(items)} items)...")
    raw = llm.generate(
        model=config.WRITER_MODEL,
        prompt=prompt,
        system=_SYSTEM,
        temperature=0.7,
    )

    result = llm.parse_json(raw)
    _save(run_dir, result)
    logger.info(f"Writer: titel='{result.get('titel', '?')}'")
    return result


def _save(run_dir: str, data: dict) -> None:
    with open(os.path.join(run_dir, "writer.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
