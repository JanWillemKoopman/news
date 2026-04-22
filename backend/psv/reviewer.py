"""
Reviewer — beoordeelt de nieuwsbrief op zes assen en stuurt feedback terug naar de Writer.
Specifieke focus: sectiecompleetheid, feitelijke specificiteit en toon.
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
Je bent een kritische eindredacteur van de PSV Nieuwsbrief. Je beoordeelt streng \
op zes assen en geeft concrete, actiegerichte feedback per verbeterpunt.\
"""

_PROMPT = """\
Beoordeel onderstaande PSV-nieuwsbrief op ZES assen (elk 1-10):

1. SECTIECOMPLEETHEID — Zijn alle verwachte secties aanwezig? (Verwacht: {verwachte_secties})
2. SPECIFICITEIT — Zijn de feiten concreet? Uitslagen, datums, namen, bedragen, \
   quotes? Niet-algemeen-abstract? Grijs-op-grijs is onvoldoende.
3. FEITELIJKHEID — Kloppen de feiten met de brondiepgang (quotes, cijfers, kernfeiten)?
4. TOON — 'Liefhebbende criticaster'? Niet te euforisch, niet te negatief.
5. STRUCTUUR — Volgt elke sectie de juiste interne opbouw (terugblik=wedstrijdverslag, \
   vooruitblik=preview, ziekenboeg=spelersoverzicht, etc.)?
6. LEESBAARHEID — Journalistiek Nederlands, rijke zinsstructuur, geen clichés?

HARDE SCORINGSREGELS:
- Sectie ontbreekt terwijl die wél verwacht was → SPECIFICITEIT max 6
- Wedstrijdverslag zonder uitslag/doelpuntenmakers/datum → SPECIFICITEIT max 5
- Vooruitblik zonder datum/tegenstander/tijd → SPECIFICITEIT max 5
- Ziekenboeg zonder concrete spelersnamen → SPECIFICITEIT max 5
- Verzonnen quote of cijfer (staat niet in brondiepgang) → FEITELIJKHEID max 4

BRONDIEPGANG (voor feitencheck):
{broninfo_json}

NIEUWSBRIEF:
{nieuwsbrief_json}

Geef je antwoord UITSLUITEND als geldig JSON:
{{
  "score": 8,
  "approved": true,
  "scores_per_as": {{
    "sectiecompleetheid": 9,
    "specificiteit": 8,
    "feitelijkheid": 8,
    "toon": 9,
    "structuur": 8,
    "leesbaarheid": 8
  }},
  "feedback": [
    {{
      "sectie": "terugblik",
      "as": "specificiteit",
      "verbeterpunt": "Noem de exacte doelpuntenmakers en minuten; 'individuele klasse' is te vaag."
    }}
  ]
}}

Totaalscore = gemiddelde van de zes assen (afgerond). approved = true als totaalscore >= {min_score}.\
"""


_MIN_WOORDEN_PRE_CHECK = 150  # harde ondergrens vóór LLM-review


def _pre_check(writer_result: dict, editor_result: dict) -> list:
    """Structuurvalidatie zonder LLM. Retourneert lijst van problemen, of [] als OK."""
    issues = []
    secties = writer_result.get("secties", [])
    sectievolgorde = editor_result.get("sectievolgorde", [])

    if len(secties) < len(sectievolgorde):
        issues.append(
            f"Verwacht {len(sectievolgorde)} secties ({', '.join(sectievolgorde)}), "
            f"maar slechts {len(secties)} ontvangen"
        )

    geleverde_ids = {s.get("sectie_id") for s in secties}
    for sid in sectievolgorde:
        if sid not in geleverde_ids:
            issues.append(f"Sectie '{sid}' ontbreekt volledig")

    for sectie in secties:
        body = sectie.get("body", "")
        word_count = len(body.split())
        sid = sectie.get("sectie_id", "?")
        if word_count < _MIN_WOORDEN_PRE_CHECK:
            issues.append(
                f"Sectie '{sid}' heeft slechts {word_count} woorden "
                f"(minimum {_MIN_WOORDEN_PRE_CHECK})"
            )

    return issues


def run_loop(
    writer_func,
    editor_result: dict,
    deep_per_sectie: dict,
    scout_profile: dict,
    run_dir: str,
) -> tuple:
    """Writer–Reviewer loop. Retourneert (writer_result, final_review)."""
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

        # Pre-check: structuurvalidatie zonder LLM
        issues = _pre_check(writer_result, editor_result)
        if issues and ronde < _MAX_RONDES:
            logger.warning(f"  Pre-check mislukt ({len(issues)} problemen) — terug naar Writer:")
            for issue in issues:
                logger.warning(f"    ✗ {issue}")
            feedback = (
                "STRUCTUURFOUTEN — los deze op vóór alles:\n"
                + "\n".join(f"- {i}" for i in issues)
            )
            review = {
                "score": 0,
                "approved": False,
                "scores_per_as": {},
                "feedback": [
                    {"sectie": "algemeen", "as": "structuur", "verbeterpunt": i}
                    for i in issues
                ],
                "pre_check_only": True,
            }
            _save_review(run_dir, ronde, review)
            continue

        review = _review(writer_result, deep_per_sectie, editor_result)
        score = review.get("score", 0)
        approved = review.get("approved", False)

        logger.info(
            f"  Reviewer: totaal {score}/10 — {'✓ Approved' if approved else '✗ Niet approved'}"
        )
        for as_naam, s in (review.get("scores_per_as") or {}).items():
            logger.info(f"    · {as_naam}: {s}/10")
        for fb in review.get("feedback", []) or []:
            if isinstance(fb, dict):
                logger.info(
                    f"    • [{fb.get('sectie', '?')}/{fb.get('as', '?')}] "
                    f"{fb.get('verbeterpunt', '')}"
                )
            else:
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

        feedback = _format_feedback(review.get("feedback", []))

    return writer_result, review


def _review(writer_result: dict, deep_per_sectie: dict, editor_result: dict) -> dict:
    # Bouw compacte broninfo per sectie
    broninfo = {}
    for sectie, items in deep_per_sectie.items():
        broninfo[sectie] = [
            {
                "titel":      item.get("titel"),
                "bron":       item.get("bron_naam"),
                "quotes":     item.get("diepgang", {}).get("quotes", []),
                "cijfers":    item.get("diepgang", {}).get("cijfers", []),
                "kernfeiten": item.get("diepgang", {}).get("kernfeiten", []),
            }
            for item in items
            if item.get("diepgang") and not item["diepgang"].get("deep_fallback")
        ]

    prompt = _PROMPT.format(
        verwachte_secties=", ".join(editor_result.get("sectievolgorde", [])),
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


def _format_feedback(feedback_list: list) -> str:
    regels = []
    for fb in feedback_list or []:
        if isinstance(fb, dict):
            regels.append(
                f"- Sectie '{fb.get('sectie', '?')}' ({fb.get('as', '?')}): "
                f"{fb.get('verbeterpunt', '')}"
            )
        else:
            regels.append(f"- {fb}")
    return "\n".join(regels)


def _save_review(run_dir: str, ronde: int, data: dict) -> None:
    path = os.path.join(run_dir, f"review_ronde_{ronde}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
