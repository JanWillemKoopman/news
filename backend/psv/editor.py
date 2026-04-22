"""
Editor — organiseert items per sectie, valideert compleetheid en bepaalt sectievolgorde.
Geen item-selectie meer (dat deden Scout + Researcher al); hoofdtaak is redactioneel
plannen van de nieuwsbriefstructuur.
"""
import json
import logging
import os

from backend.psv import config, llm
from backend.psv.config import SEEN_ITEMS_FILE

logger = logging.getLogger(__name__)

# Standaard sectievolgorde in de nieuwsbrief
_STANDAARD_VOLGORDE = [
    "terugblik",
    "vooruitblik",
    "ziekenboeg",
    "transfers",
    "achtergrond",
]

_SECTIE_LABELS = {
    "terugblik":   "Terugblik",
    "vooruitblik": "Vooruitblik",
    "ziekenboeg":  "Ziekenboeg & Schorsingen",
    "transfers":   "Transfers & Geruchten",
    "achtergrond": "Achtergrond & Analyse",
}

_SYSTEM = """\
Je bent hoofdredacteur van de PSV Nieuwsbrief. Je plant de structuur van deze editie: \
welke secties komen erin, in welke volgorde, en waarom.\
"""

_PROMPT = """\
Je stelt de redactionele structuur samen voor de komende PSV-nieuwsbrief.

CONTEXT SCOUT:
{scout_json}

BESCHIKBAAR MATERIAAL PER SECTIE (aantal items):
{sectie_samenvatting}

EERDER GEPUBLICEERDE KEYWORDS (vermijd overlap waar mogelijk):
{seen_keywords}

Je taak:
1. Kies de DEFINITIEVE sectievolgorde uit: terugblik, vooruitblik, ziekenboeg, transfers, achtergrond.
   Volg de standaardvolgorde tenzij er een redactionele reden is om te wisselen.
2. Beschrijf voor elke sectie 1 zin 'redactionele hoek': het verhaal dat de sectie moet vertellen.
3. Geef een 'kopverhaal' aan: welke sectie (doorgaans terugblik of vooruitblik) vormt het \
   narratief-anker voor de inleiding.

Geef je antwoord UITSLUITEND als geldig JSON:
{{
  "sectievolgorde": ["terugblik", "vooruitblik", "ziekenboeg", "transfers", "achtergrond"],
  "sectie_hoeken": {{
    "terugblik":   "Focus op de werkoverwinning bij Sparta en wat het betekent voor de titelstrijd.",
    "vooruitblik": "PEC Zwolle als graadmeter voor de vorm richting de topper tegen Ajax.",
    "ziekenboeg":  "Veerman keert terug, Schouten lange tijd uit.",
    "transfers":   "Zomerplanning krijgt contouren; concrete namen in omloop.",
    "achtergrond": "Discussie medische staf en opbouw naar kampioensfeest."
  }},
  "kopverhaal_sectie": "vooruitblik"
}}\
"""


def run(deep_per_sectie: dict, scout_profile: dict, run_dir: str) -> dict:
    verplichte = scout_profile.get("verplichte_secties", _STANDAARD_VOLGORDE)
    seen_kw = _load_seen_keywords(max_keywords=60)

    sectie_samenvatting = "\n".join(
        f"- {s} ({len(deep_per_sectie.get(s, []))} items beschikbaar)"
        for s in verplichte
    )

    prompt = _PROMPT.format(
        scout_json=json.dumps(scout_profile, ensure_ascii=False, indent=2),
        sectie_samenvatting=sectie_samenvatting,
        seen_keywords=", ".join(seen_kw) if seen_kw else "geen",
    )

    logger.info("Editor: plant nieuwsbriefstructuur...")
    try:
        raw = llm.generate(
            model=config.EDITOR_MODEL,
            prompt=prompt,
            system=_SYSTEM,
            temperature=0.3,
        )
        plan = llm.parse_json(raw)
    except Exception as e:
        logger.warning(f"Editor LLM-call mislukt ({e}), val terug op standaardvolgorde")
        plan = {
            "sectievolgorde":   [s for s in _STANDAARD_VOLGORDE if s in verplichte],
            "sectie_hoeken":    {s: "" for s in verplichte},
            "kopverhaal_sectie": "terugblik" if "terugblik" in verplichte else "vooruitblik",
        }

    # Filter volgorde naar alleen secties met items
    volgorde = [
        s for s in plan.get("sectievolgorde", _STANDAARD_VOLGORDE)
        if deep_per_sectie.get(s)
    ]
    # Voeg eventuele ontbrekende secties met items toch toe
    for s in deep_per_sectie:
        if s not in volgorde and deep_per_sectie.get(s):
            volgorde.append(s)

    # ── Harde programmatische regels ────────────────────────────
    # 1. Wedstrijd binnen 48 uur: vooruitblik VERPLICHT als eerste sectie
    if scout_profile.get("requires_match_preview"):
        if "vooruitblik" not in volgorde and deep_per_sectie.get("vooruitblik"):
            volgorde.insert(0, "vooruitblik")
            logger.info("Editor: vooruitblik geforceerd als eerste (wedstrijd binnen 48u)")
        elif "vooruitblik" in volgorde:
            volgorde.remove("vooruitblik")
            volgorde.insert(0, "vooruitblik")
            logger.info("Editor: vooruitblik naar positie 1 verplaatst (wedstrijd binnen 48u)")

    # 2. Recente wedstrijd (≤10 dagen): terugblik altijd opnemen als data beschikbaar
    dagen_geleden = (scout_profile.get("laatste_wedstrijd") or {}).get("dagen_geleden", 99)
    if (
        isinstance(dagen_geleden, (int, float))
        and dagen_geleden <= 10
        and "terugblik" not in volgorde
        and deep_per_sectie.get("terugblik")
    ):
        volgorde.insert(0, "terugblik")
        logger.info("Editor: terugblik geforceerd toegevoegd (wedstrijd ≤10d geleden)")

    voor_lege = [s for s in verplichte if not deep_per_sectie.get(s)]
    if voor_lege:
        logger.warning(f"Editor: lege verplichte secties overgeslagen: {voor_lege}")

    result = {
        "sectievolgorde":     volgorde,
        "sectie_hoeken":      plan.get("sectie_hoeken", {}),
        "kopverhaal_sectie":  plan.get("kopverhaal_sectie"),
        "items_per_sectie":   deep_per_sectie,
        "sectie_labels":      {s: _SECTIE_LABELS.get(s, s.title()) for s in volgorde},
    }

    _save(run_dir, result)
    logger.info(f"Editor: volgorde={volgorde}, anker={result.get('kopverhaal_sectie')}")
    return result


def _load_seen_keywords(max_keywords: int) -> list:
    if not SEEN_ITEMS_FILE.exists():
        return []
    with open(SEEN_ITEMS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    kw = []
    for entry in data.get("items", [])[-25:]:
        kw.extend(entry.get("keywords", []))
    return list(set(kw))[:max_keywords]


def _save(run_dir: str, data: dict) -> None:
    # items_per_sectie is te groot voor audit-log, bewaar alleen metadata
    audit = {k: v for k, v in data.items() if k != "items_per_sectie"}
    audit["items_per_sectie_counts"] = {
        s: len(items) for s, items in data.get("items_per_sectie", {}).items()
    }
    with open(os.path.join(run_dir, "editor.json"), "w", encoding="utf-8") as f:
        json.dump(audit, f, indent=2, ensure_ascii=False)
