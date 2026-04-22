"""
Reviewer — beoordeelt de nieuwsbrief op vijf assen en stuurt feedback terug naar de Writer.
Loop tot score >= 8 of max 3 rondes.
"""
import json
import logging
import os

from backend.psv import config, llm

logger = logging.getLogger(__name__)

_MAX_RONDES = 3
_MIN_SCORE = 8

_SYSTEM = """\
Je bent een kritische eindredacteur van de PSV Nieuwsbrief. Je beoordeelt nauwkeurig \
op vijf assen en geeft concrete, actiegerichte feedback.\
"""

_PROMPT = """\
Beoordeel de PSV-nieuwsbrief hieronder op vijf assen (elk 1-10):

1. FEITELIJKHEID: Kloppen alle quotes en cijfers met de broninfo? \
   Zijn er claims die niet terug te vinden zijn in de brondiepgang?
2. TOON: Is de toon 'liefhebbende criticaster'? Niet te euforisch, niet te negatief, \
   niet te neutraal. Voelt het als een echte PSV-supporter met journalistieke distantie?
3. STRUCTUUR: Volgt elk sub-artikel het patroon aanleiding → context → consequentie? \
   Zijn de kop en lead representatief voor de body?
4. LEESBAARHEID: Helder journalistiek Nederlands? Geen woordherhalingen, clichés of \
   stopwoorden? Gevarieerde zinsstructuur?
5. RELEVANTIE: Zijn de gekozen items relevant en interessant voor PSV-supporters? \
   Goede afwisseling van categorieën?

BRONDIEPGANG (gebruik dit voor feitelijkheidscheck):
{broninfo_json}

NIEUWSBRIEF:
{nieuwsbrief_json}

Geef je antwoord UITSLUITEND als geldig JSON:
{{
  "score": 8,
  "approved": true,
  "scores_per_as": {{
    "feitelijkheid": 8,
    "toon": 9,
    "structuur": 7,
    "leesbaarheid": 8,
    "relevantie": 9
  }},
  "feedback": [
    "Concreet verbeterpunt 1 (verwijs naar specifiek item of passage)",
    "Concreet verbeterpunt 2"
  ]
}}

approved = true als totaalscore >= {min_score}.\
"""


def run_loop(
    writer_func,
    editor_result: dict,
    deep_items: list,
    scout_profile: dict,
    run_dir: str,
) -> tuple:
    """Writer–Reviewer loop. Geeft (writer_result, final_review) terug."""
    writer_result = None
    review = None
    feedback = None

    for ronde in range(1, _MAX_RONDES + 1):
        logger.info(f"Writer–Reviewer ronde {ronde}/{_MAX_RONDES}")

        writer_result = writer_func(
            editor_result=editor_result,
            scout_profile=scout_profile,
            run_dir=run_dir,
            feedback=feedback,
        )

        review = _review(writer_result, deep_items)
        score = review.get("score", 0)
        approved = review.get("approved", False)

        logger.info(
            f"  Reviewer score: {score}/10 — "
            f"{'✓ Approved' if approved else '✗ Niet approved'}"
        )
        if review.get("feedback"):
            for fb in review["feedback"]:
                logger.info(f"    • {fb}")

        _save_review(run_dir, ronde, review)

        if approved:
            break

        if ronde == _MAX_RONDES:
            logger.warning(
                f"Na {_MAX_RONDES} rondes niet approved (score {score}). "
                f"Laatste versie wordt gepubliceerd."
            )
            break

        feedback = "\n".join(f"- {fb}" for fb in review.get("feedback", []))

    return writer_result, review


def _review(writer_result: dict, deep_items: list) -> dict:
    # Bouw broninfo op (alleen items met echte diepgang)
    broninfo = [
        {
            "titel":   item.get("titel"),
            "quotes":  item["diepgang"].get("quotes", []),
            "cijfers": item["diepgang"].get("cijfers", []),
        }
        for item in deep_items
        if item.get("diepgang") and not item["diepgang"].get("deep_fallback")
    ]

    prompt = _PROMPT.format(
        broninfo_json=json.dumps(broninfo, ensure_ascii=False, indent=2),
        nieuwsbrief_json=json.dumps(writer_result, ensure_ascii=False, indent=2),
        min_score=_MIN_SCORE,
    )

    raw = llm.generate(
        model=config.REVIEWER_MODEL,
        prompt=prompt,
        system=_SYSTEM,
        temperature=0.2,
    )
    return llm.parse_json(raw)


def _save_review(run_dir: str, ronde: int, data: dict) -> None:
    path = os.path.join(run_dir, f"review_ronde_{ronde}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
