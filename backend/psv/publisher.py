"""
Publisher — rendert de nieuwsbrief naar markdown en slaat op in summaries.json.
Geen LLM-call.
"""
import json
import logging
import os
from datetime import datetime, timedelta

from backend.psv import dedup
from backend.storage import save_summary

logger = logging.getLogger(__name__)


def run(
    writer_result: dict,
    deep_items: list,
    scout_profile: dict,
    run_dir: str,
    dry_run: bool = False,
) -> dict:
    titel = writer_result.get("titel", "PSV Nieuwsbrief")
    inleiding = writer_result.get("inleiding", "")
    sub_items = writer_result.get("items", [])

    # Render naar markdown
    markdown_delen = [inleiding.strip()]
    for item in sub_items:
        kop  = item.get("kop", "")
        lead = item.get("lead", "")
        body = item.get("body", "")
        markdown_delen.append(f"## {kop}\n\n{lead}\n\n{body}")

    summary_markdown = "\n\n".join(markdown_delen)

    # Week-bereik: maandag t/m zondag van de huidige week
    today = datetime.now()
    week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
    week_end   = today.strftime("%Y-%m-%d")

    # Bronnen: unieke URLs en domeinnamen
    sources = list({
        item.get("bron_url") or item.get("bron_naam", "")
        for item in deep_items
        if item.get("bron_url") or item.get("bron_naam")
    })

    if dry_run:
        logger.info(
            f"DRY RUN — Publisher zou opslaan: '{titel}' "
            f"met {len(sub_items)} sub-artikelen"
        )
        entry = {
            "dry_run": True,
            "titel": titel,
            "n_items": len(sub_items),
            "week_start": week_start,
            "week_end": week_end,
        }
    else:
        entry = save_summary(
            title=titel,
            summary=summary_markdown,
            week_start=week_start,
            week_end=week_end,
            sources=sources,
        )
        dedup.mark_seen(deep_items)
        logger.info(f"Publisher: opgeslagen als ID {entry.get('id')}")

    _save(run_dir, {"entry": entry, "dry_run": dry_run})
    return entry


def _save(run_dir: str, data: dict) -> None:
    with open(os.path.join(run_dir, "publisher.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
