"""
Publisher — rendert de nieuwsbrief (intro + secties) naar markdown en slaat op.
Geen LLM-call.
"""
import json
import logging
import os
from datetime import datetime, timedelta

from backend.psv import dedup
from backend.storage import save_summary

logger = logging.getLogger(__name__)

_SECTIE_LABELS = {
    "terugblik":   "Terugblik",
    "vooruitblik": "Vooruitblik",
    "ziekenboeg":  "Ziekenboeg & Schorsingen",
    "transfers":   "Transfers & Geruchten",
    "achtergrond": "Achtergrond & Analyse",
}


def run(
    writer_result: dict,
    deep_per_sectie: dict,
    scout_profile: dict,
    run_dir: str,
    dry_run: bool = False,
) -> dict:
    titel = writer_result.get("titel", "PSV Nieuwsbrief")
    teaser = writer_result.get("teaser", [])
    inleiding = writer_result.get("inleiding", "")
    secties = writer_result.get("secties", [])

    # Render naar markdown — teaser bovenaan als kader-blok
    markdown_delen = []
    if teaser:
        bullets = "\n".join(f"- {t}" for t in teaser)
        markdown_delen.append(f":::kader\n**In deze editie:**\n{bullets}\n:::")
    if inleiding:
        markdown_delen.append(inleiding.strip())
    for sectie in secties:
        sectie_id = sectie.get("sectie_id", "")
        kop = sectie.get("kop") or _SECTIE_LABELS.get(sectie_id, sectie_id.title())
        body = sectie.get("body", "")
        markdown_delen.append(f"## {kop}\n\n{body.strip()}")

    summary_markdown = "\n\n".join(markdown_delen)

    # Week-bereik
    today = datetime.now()
    week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
    week_end = today.strftime("%Y-%m-%d")

    # Verzamel alle bron-URLs
    alle_items = []
    for items in deep_per_sectie.values():
        alle_items.extend(items)

    sources = list({
        item.get("bron_url") or item.get("bron_naam", "")
        for item in alle_items
        if item.get("bron_url") or item.get("bron_naam")
    })

    if dry_run:
        logger.info(
            f"DRY RUN — Publisher zou opslaan: '{titel}' met {len(secties)} secties"
        )
        entry = {
            "dry_run":    True,
            "titel":      titel,
            "n_secties":  len(secties),
            "week_start": week_start,
            "week_end":   week_end,
        }
    else:
        entry = save_summary(
            title=titel,
            summary=summary_markdown,
            week_start=week_start,
            week_end=week_end,
            sources=sources,
        )
        dedup.mark_seen(alle_items)
        logger.info(f"Publisher: opgeslagen als ID {entry.get('id')}")

    _save(run_dir, {"entry": entry, "dry_run": dry_run})
    return entry


def _save(run_dir: str, data: dict) -> None:
    with open(os.path.join(run_dir, "publisher.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
