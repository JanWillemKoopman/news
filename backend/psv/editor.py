"""
Editor — selecteert 4-6 items en ordent ze dramaturgisch.
1 LLM-call, geen web search.
"""
import json
import logging
import os

from backend.psv import config, llm
from backend.psv.config import SEEN_ITEMS_FILE

logger = logging.getLogger(__name__)

_SYSTEM = """\
Je bent hoofdredacteur van de PSV Nieuwsbrief. Je selecteert de beste items voor deze editie \
en rangschikt ze voor maximale leesbeleving. Je denkt als een ervaren sportredacteur: \
nieuwswaarde, diversiteit en dramaturgisch ritme zijn je kompas.\
"""

_PROMPT = """\
Je stelt de volgende PSV-nieuwsbrief samen.

CONTEXT SCOUT:
{scout_json}

BESCHIKBARE ITEMS ({n_items} stuks):
{items_json}

AL GEZIENE KEYWORDS (vermijd overlap):
{seen_keywords}

SELECTIECRITERIA:
1. Nieuwswaarde: recente, impactvolle ontwikkelingen gaan voor
2. Diversiteit: niet meer dan 2 items uit dezelfde categorie
3. Prioriteitsonderwerpen van de Scout hebben voorrang
4. Vermijd items die sterk overlappen met eerder geziene keywords

DRAMATURGISCHE VOLGORDE:
- Positie 1 (opening): grootste impact of meest opvallend nieuws van de week
- Posities 2-4 (kern): diepgang, analyses, interviews
- Laatste positie (afsluiter): positief, vooruitblik of luchtig item

Selecteer precies 4-6 items. Geef je antwoord UITSLUITEND als geldig JSON:
{{
  "geselecteerde_items": [
    {{
      "bron_url": "https://...",
      "titel": "string",
      "categorie": "string",
      "rangorde_reden": "1 zin waarom dit op deze plek staat"
    }}
  ],
  "volgorde_rationale": "2-3 zinnen over de dramaturgische keuze voor deze editie"
}}\
"""


def run(deep_items: list, scout_profile: dict, run_dir: str) -> dict:
    # Haal seen keywords op voor dedup-context
    seen_kw = _load_seen_keywords(max_keywords=60)

    # Strip diepgang uit items voor de Editor-prompt (te lang)
    items_compact = [
        {k: v for k, v in item.items() if k != "diepgang"}
        for item in deep_items
    ]

    prompt = _PROMPT.format(
        scout_json=json.dumps(scout_profile, ensure_ascii=False, indent=2),
        n_items=len(deep_items),
        items_json=json.dumps(items_compact, ensure_ascii=False, indent=2),
        seen_keywords=", ".join(seen_kw) if seen_kw else "geen (eerste editie)",
    )

    logger.info("Editor: selecteert en rangschikt items...")
    raw = llm.generate(
        model=config.EDITOR_MODEL,
        prompt=prompt,
        system=_SYSTEM,
        temperature=0.3,
    )

    result = llm.parse_json(raw)

    # Koppel geselecteerde URLs terug aan volledige deep_items (inclusief diepgang)
    selected_urls = {item["bron_url"] for item in result.get("geselecteerde_items", [])}
    url_to_order = {
        item["bron_url"]: idx
        for idx, item in enumerate(result.get("geselecteerde_items", []))
    }

    items_volledig = [i for i in deep_items if i.get("bron_url") in selected_urls]
    items_volledig.sort(key=lambda i: url_to_order.get(i.get("bron_url", ""), 99))
    result["items_volledig"] = items_volledig

    _save(run_dir, result)
    logger.info(
        f"Editor: {len(items_volledig)} items geselecteerd — "
        f"{result.get('volgorde_rationale', '')[:80]}..."
    )
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
    # Sla op zonder items_volledig (te groot voor audit)
    audit = {k: v for k, v in data.items() if k != "items_volledig"}
    with open(os.path.join(run_dir, "editor.json"), "w", encoding="utf-8") as f:
        json.dump(audit, f, indent=2, ensure_ascii=False)
